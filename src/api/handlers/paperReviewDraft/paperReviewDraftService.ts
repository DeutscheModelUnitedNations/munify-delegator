import { db, schema, type Transaction } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { paperReviewDraftPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { translatePaperStatus } from '#lib/utils/enumTranslations';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { z } from 'zod';
import { REVIEWABLE_STATUSES } from '../paperReview/paperReviewService';
import { unmatchedQuotes } from './quoteCheck';
import { markdownToReviewDocument } from './reviewMarkdown';

/**
 * Review drafts: a review not sent yet, at most one per paper and reviewer. A draft is the
 * reviewer's alone - it reaches no author, changes no status and counts as no review - and
 * submitting the review (`createPaperReview`) deletes it. An AI assistant writes one over MCP;
 * the reviewer edits, sends or discards it in the review editor.
 */

type Origin = (typeof schema.paperReviewDraft.$inferSelect)['origin'];
type Verdict = (typeof schema.paperReviewDraft.$inferSelect)['statusAfter'];
type Comments = (typeof schema.paperReviewDraft.$inferInsert)['comments'];

/** The longest Markdown text an assistant may send as a draft. */
export const MAX_DRAFT_MARKDOWN_LENGTH = 50_000;

/** The Markdown text of a draft written over MCP. */
export const reviewDraftMarkdownSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.reviewDraftContentRequired() })
	.max(MAX_DRAFT_MARKDOWN_LENGTH, {
		error: () => m.reviewDraftContentTooLong({ max: MAX_DRAFT_MARKDOWN_LENGTH })
	});

/** The paper a draft is for: its status, conference and latest version. */
async function loadDraftTarget({ tx, paperId }: { tx: Transaction; paperId: string }) {
	const paper = await tx.query.paper.findFirst({
		where: { id: paperId },
		columns: { id: true, status: true },
		with: {
			delegation: { columns: { conferenceId: true } },
			versions: {
				orderBy: { version: 'desc' },
				limit: 1,
				columns: { id: true, version: true, content: true }
			}
		}
	});
	if (!paper) throw apiError({ code: 'NOT_FOUND', message: m.reviewOnlyReviewers() });
	if (!REVIEWABLE_STATUSES.includes(paper.status)) {
		throw apiError({
			code: 'CONFLICT',
			message: m.reviewStatusNotReviewable({ status: translatePaperStatus(paper.status) })
		});
	}
	const latestVersion = paper.versions.at(0);
	if (!latestVersion) throw apiError({ code: 'CONFLICT', message: m.reviewNoVersions() });
	return { conferenceId: paper.delegation.conferenceId, latestVersion };
}

/** The reviewer's draft of the paper, locked for the rest of the transaction. */
async function lockDraft({
	tx,
	paperId,
	reviewerId
}: {
	tx: Transaction;
	paperId: string;
	reviewerId: string;
}) {
	const [draft] = await tx
		.select({
			id: schema.paperReviewDraft.id,
			lastEditedVia: schema.paperReviewDraft.lastEditedVia,
			paperVersionId: schema.paperReviewDraft.paperVersionId
		})
		.from(schema.paperReviewDraft)
		.where(whereRows({ table: schema.paperReviewDraft, filter: { paperId, reviewerId } }))
		.for('update');
	return draft;
}

/**
 * Whether an assistant would replace what the reviewer wrote in the app. It may only when told
 * to (`overwriteAppEdits`), which it is to ask the reviewer about first.
 */
export function replacesAppEdits({
	draft,
	by,
	overwriteAppEdits
}: {
	draft: { lastEditedVia: Origin } | undefined;
	by: Origin;
	overwriteAppEdits: boolean;
}) {
	return by === 'MCP' && draft?.lastEditedVia === 'UI' && !overwriteAppEdits;
}

function assertNoAppEditsReplaced(args: Parameters<typeof replacesAppEdits>[0]) {
	if (replacesAppEdits(args)) {
		throw apiError({ code: 'CONFLICT', message: m.reviewDraftEditedInApp() });
	}
}

/**
 * Writes the reviewer's draft of a paper, replacing the one there is. An assistant's draft (`by:
 * 'MCP'`) starts over: it is written for the latest version and counts as the assistant's,
 * and refuses (CONFLICT) to replace what the reviewer changed in the app unless
 * `overwriteAppEdits`. The reviewer's edits keep the version the draft was written for. Refuses
 * (CONFLICT) a paper that is a draft itself, like a review.
 */
export async function saveReviewDraft({
	paperId,
	reviewerId,
	comments,
	statusAfter,
	by,
	overwriteAppEdits = false
}: {
	paperId: string;
	reviewerId: string;
	comments: Comments;
	statusAfter: Verdict;
	by: Origin;
	overwriteAppEdits?: boolean;
}) {
	const saved = await db.transaction(async (tx) => {
		const { conferenceId, latestVersion } = await loadDraftTarget({ tx, paperId });
		const draft = await lockDraft({ tx, paperId, reviewerId });
		assertNoAppEditsReplaced({ draft, by, overwriteAppEdits });

		const now = new Date();
		const startsOver = by === 'MCP' || !draft;
		const written = await tx
			.insert(schema.paperReviewDraft)
			.values({
				paperId,
				reviewerId,
				paperVersionId: latestVersion.id,
				comments,
				statusAfter,
				origin: by,
				lastEditedVia: by
			})
			.onConflictDoUpdate({
				target: [schema.paperReviewDraft.paperId, schema.paperReviewDraft.reviewerId],
				set: startsOver
					? {
							paperVersionId: latestVersion.id,
							comments,
							statusAfter,
							origin: by,
							lastEditedVia: by,
							createdAt: now,
							updatedAt: now
						}
					: { comments, statusAfter, lastEditedVia: by, updatedAt: now }
			})
			.returning({
				id: schema.paperReviewDraft.id,
				paperVersionId: schema.paperReviewDraft.paperVersionId
			})
			.then(assertFirstEntryExists);

		return { ...written, created: !draft, conferenceId, latestVersion };
	});
	if (saved.created) paperReviewDraftPubsub.created();
	else paperReviewDraftPubsub.updated(saved.id);
	return saved;
}

/**
 * Writes an assistant's draft from Markdown (`reviewMarkdown.ts`) and answers which of its quotes
 * the paper's latest version does not contain word for word (`quoteCheck.ts`).
 */
export async function saveAssistantReviewDraft({
	paperId,
	reviewerId,
	markdown,
	statusAfter,
	overwriteAppEdits
}: {
	paperId: string;
	reviewerId: string;
	markdown: string;
	statusAfter: Verdict;
	overwriteAppEdits: boolean;
}) {
	const comments = markdownToReviewDocument(markdown);
	const saved = await saveReviewDraft({
		paperId,
		reviewerId,
		comments,
		statusAfter,
		by: 'MCP',
		overwriteAppEdits
	});
	return {
		id: saved.id,
		conferenceId: saved.conferenceId,
		paperVersion: saved.latestVersion.version,
		unmatchedQuotes: unmatchedQuotes({
			review: comments,
			paperContent: saved.latestVersion.content
		})
	};
}

/**
 * Deletes the reviewer's draft of a paper; false when there was none. An assistant refuses
 * (CONFLICT) to delete what the reviewer changed in the app unless `overwriteAppEdits`.
 */
export async function deleteReviewDraft({
	paperId,
	reviewerId,
	by,
	overwriteAppEdits = false
}: {
	paperId: string;
	reviewerId: string;
	by: Origin;
	overwriteAppEdits?: boolean;
}) {
	const deleted = await db.transaction(async (tx) => {
		const draft = await lockDraft({ tx, paperId, reviewerId });
		if (!draft) return false;
		assertNoAppEditsReplaced({ draft, by, overwriteAppEdits });
		await tx
			.delete(schema.paperReviewDraft)
			.where(whereRows({ table: schema.paperReviewDraft, filter: { id: draft.id } }));
		return true;
	});
	if (deleted) paperReviewDraftPubsub.removed();
	return deleted;
}

/** Where the reviewer finds the paper with the draft in its review editor. */
export function reviewDraftLink({
	origin,
	conferenceId,
	paperId
}: {
	origin: string;
	conferenceId: string;
	paperId: string;
}) {
	return `${origin}/dashboard/${conferenceId}/paperhub/${paperId}#review`;
}
