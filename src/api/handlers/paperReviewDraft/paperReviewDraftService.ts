import { db, schema, type Transaction } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { paperReviewDraftPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { assertReviewable } from '../paperReview/paperReviewService';
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
const MAX_DRAFT_MARKDOWN_LENGTH = 50_000;

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
	return {
		conferenceId: paper.delegation.conferenceId,
		latestVersion: assertReviewable({ paper })
	};
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
			paperVersionId: schema.paperReviewDraft.paperVersionId,
			updatedAt: schema.paperReviewDraft.updatedAt
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

type Refusal = 'EDITED_IN_APP' | 'CHANGED_ELSEWHERE';

/**
 * Why a write may not go ahead on the locked draft, if it may not: an assistant would replace
 * what the reviewer changed in the app (`replacesAppEdits`), or the review editor would replace a
 * draft that changed since it saw it (`changedSinceSeen`, only with `expected`).
 */
export function writeRefusal({
	draft,
	by,
	overwriteAppEdits,
	expected
}: {
	draft: { lastEditedVia: Origin; updatedAt: Date } | undefined;
	by: Origin;
	overwriteAppEdits: boolean;
	expected: { updatedAt: Date | null } | undefined;
}): Refusal | undefined {
	if (replacesAppEdits({ draft, by, overwriteAppEdits })) return 'EDITED_IN_APP';
	if (expected && changedSinceSeen({ draft, expectedUpdatedAt: expected.updatedAt })) {
		return 'CHANGED_ELSEWHERE';
	}
	return undefined;
}

const REFUSAL_MESSAGES: Record<Refusal, () => string> = {
	EDITED_IN_APP: () => m.reviewDraftEditedInApp(),
	CHANGED_ELSEWHERE: () => m.reviewDraftChangedElsewhere()
};

function throwRefusal(refusal: Refusal | undefined) {
	if (refusal) throw apiError({ code: 'CONFLICT', message: REFUSAL_MESSAGES[refusal]() });
}

/**
 * The `updatedAt` a write over a stored draft sets: now, but always later than the stored row's,
 * read by Postgres from the row being updated. Two writes within one millisecond, or one that
 * found no draft and then met another's first write, still tell apart for `changedSinceSeen`.
 * Timestamps are stored as UTC without a zone, the way drizzle writes them.
 */
function laterThanStored(now: Date) {
	const utc = now.toISOString().replace('T', ' ').replace('Z', '');
	return sql`greatest(${utc}::timestamp(3), ${schema.paperReviewDraft.updatedAt} + interval '1 millisecond')`;
}

/**
 * Whether the draft changed since the review editor last loaded or saved it (`expectedUpdatedAt`,
 * null when it saw none): another tab saved it, an assistant rewrote it, or it was discarded or
 * created elsewhere. The editor would replace that unseen, so its save is refused.
 */
export function changedSinceSeen({
	draft,
	expectedUpdatedAt
}: {
	draft: { updatedAt: Date } | undefined;
	expectedUpdatedAt: Date | null;
}) {
	return (draft?.updatedAt.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null);
}

/**
 * Keeps the upsert to the row the editor saw: with none seen, a draft written after the lock
 * found none is not replaced either.
 */
function keepUnseenDraft(draft: { id: string } | undefined) {
	return {
		setWhere: whereRows({
			table: schema.paperReviewDraft,
			filter: draft ? { id: draft.id } : { id: { isNull: true } }
		})
	};
}

/**
 * What a draft row already there is set to. An assistant's draft, or the reviewer's first, starts
 * over: written for the latest version and counted as new. The reviewer's edits keep the rest,
 * the version too unless the editor names the one its text was written for (`pinsVersion`).
 */
export function conflictUpdate({
	startsOver,
	pinsVersion = false,
	paperVersionId,
	comments,
	statusAfter,
	by,
	now
}: {
	startsOver: boolean;
	pinsVersion?: boolean;
	paperVersionId: string;
	comments: Comments;
	statusAfter: Verdict;
	by: Origin;
	now: Date;
}) {
	const edit = { comments, statusAfter, lastEditedVia: by, updatedAt: now };
	if (startsOver) return { ...edit, paperVersionId, origin: by, createdAt: now };
	return pinsVersion ? { ...edit, paperVersionId } : edit;
}

/**
 * The version of the paper a draft is written for: the one the editor names (its text was written
 * for it, an older one kept over an assistant's rewrite for a newer one included), else the latest.
 */
async function draftVersionId({
	tx,
	paperId,
	latestVersion,
	writtenFor
}: {
	tx: Transaction;
	paperId: string;
	latestVersion: { id: string; version: number };
	writtenFor: number | undefined;
}) {
	if (writtenFor === undefined || writtenFor === latestVersion.version) return latestVersion.id;
	const [version] = await tx
		.select({ id: schema.paperVersion.id })
		.from(schema.paperVersion)
		.where(whereRows({ table: schema.paperVersion, filter: { paperId, version: writtenFor } }));
	if (!version) throw apiError({ code: 'NOT_FOUND', message: m.reviewOnlyReviewers() });
	return version.id;
}

/**
 * Keeps the upsert off a row the reviewer edited in the app, when the assistant may not replace
 * it: their first draft may have been written after the lock found none.
 */
function keepAppEdits({ by, overwriteAppEdits }: { by: Origin; overwriteAppEdits: boolean }) {
	if (!replacesAppEdits({ draft: { lastEditedVia: 'UI' }, by, overwriteAppEdits })) return {};
	return {
		setWhere: whereRows({ table: schema.paperReviewDraft, filter: { lastEditedVia: { ne: 'UI' } } })
	};
}

/**
 * Writes the reviewer's draft of a paper, replacing the one there is. An assistant's draft (`by:
 * 'MCP'`) starts over: it is written for the latest version and counts as the assistant's,
 * and refuses (CONFLICT) to replace what the reviewer changed in the app unless
 * `overwriteAppEdits`. The reviewer's edits keep the version the draft was written for. With
 * `expected` (the review editor's saves), refuses (CONFLICT) when the draft changed since the
 * editor saw it (`changedSinceSeen`). Refuses (CONFLICT) a paper that is a draft itself, like a
 * review.
 */
export async function saveReviewDraft({
	paperId,
	reviewerId,
	comments,
	statusAfter,
	by,
	overwriteAppEdits = false,
	expected,
	writtenFor
}: {
	paperId: string;
	reviewerId: string;
	comments: Comments;
	statusAfter: Verdict;
	by: Origin;
	overwriteAppEdits?: boolean;
	/** The draft as the saving editor last saw it: its `updatedAt`, null for none. */
	expected?: { updatedAt: Date | null };
	/** The paper version the editor's text was written for; the latest when not given. */
	writtenFor?: number;
}) {
	const saved = await db.transaction(async (tx) => {
		const { conferenceId, latestVersion } = await loadDraftTarget({ tx, paperId });
		const draft = await lockDraft({ tx, paperId, reviewerId });
		throwRefusal(writeRefusal({ draft, by, overwriteAppEdits, expected }));
		const paperVersionId = await draftVersionId({ tx, paperId, latestVersion, writtenFor });

		const written = await upsertDraft({
			tx,
			draft,
			row: { paperId, reviewerId, paperVersionId, comments, statusAfter },
			pinsVersion: writtenFor !== undefined,
			by,
			guard: expected ? keepUnseenDraft(draft) : keepAppEdits({ by, overwriteAppEdits })
		});
		// Nothing written: the guard kept a row the writer may not replace.
		if (!written) throwRefusal(expected ? 'CHANGED_ELSEWHERE' : 'EDITED_IN_APP');

		return {
			...written,
			version: await versionNumber({ tx, paperVersionId: written.paperVersionId }),
			created: !draft,
			conferenceId,
			latestVersion
		};
	});
	if (saved.created) paperReviewDraftPubsub.created();
	else paperReviewDraftPubsub.updated(saved.id);
	return saved;
}

/** Inserts the draft, or updates the one there is unless `guard` keeps it; the row written. */
async function upsertDraft({
	tx,
	draft,
	row,
	pinsVersion,
	by,
	guard
}: {
	tx: Transaction;
	draft: { updatedAt: Date } | undefined;
	pinsVersion: boolean;
	row: {
		paperId: string;
		reviewerId: string;
		paperVersionId: string;
		comments: Comments;
		statusAfter: Verdict;
	};
	by: Origin;
	guard: ReturnType<typeof keepAppEdits>;
}) {
	const now = new Date();
	const [written] = await tx
		.insert(schema.paperReviewDraft)
		.values({ ...row, origin: by, lastEditedVia: by, createdAt: now, updatedAt: now })
		.onConflictDoUpdate({
			target: [schema.paperReviewDraft.paperId, schema.paperReviewDraft.reviewerId],
			set: {
				...conflictUpdate({
					startsOver: by === 'MCP' || !draft,
					pinsVersion,
					paperVersionId: row.paperVersionId,
					comments: row.comments,
					statusAfter: row.statusAfter,
					by,
					now
				}),
				updatedAt: laterThanStored(now)
			},
			...guard
		})
		.returning({
			id: schema.paperReviewDraft.id,
			paperVersionId: schema.paperReviewDraft.paperVersionId,
			updatedAt: schema.paperReviewDraft.updatedAt
		});
	return written;
}

/** The number of a paper version, read while the draft naming it is still locked. */
async function versionNumber({ tx, paperVersionId }: { tx: Transaction; paperVersionId: string }) {
	const [version] = await tx
		.select({ version: schema.paperVersion.version })
		.from(schema.paperVersion)
		.where(whereRows({ table: schema.paperVersion, filter: { id: paperVersionId } }));
	if (!version) throw apiError({ code: 'NOT_FOUND', message: m.reviewOnlyReviewers() });
	return version.version;
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
		throwRefusal(writeRefusal({ draft, by, overwriteAppEdits, expected: undefined }));
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
