import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { z } from 'zod';
import { db, schema, type Transaction } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { guidePagePubsub, guidePageVersionPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import {
	EMPTY_DOCUMENT,
	guideDocumentSchema,
	parseGuideDocument,
	referencedFileIds,
	richBlocksIn,
	type GuideDocument
} from '#lib/guide/document';
import {
	conferenceYear,
	sameScope,
	scopeFor,
	scopeKindOf,
	scopeReaches,
	type GuideScope,
	type GuideScopeKind,
	type ScopeTarget
} from '#lib/guide/scope';
import { markdownToGuideDocument } from './guideMarkdown';
import { downloadUrl } from '../storedFile/storedFileService';
import {
	conferenceYearSql,
	draftOrPublishedReaches,
	draftScope,
	publishedScope,
	reachesAnyOf
} from './guideReach';

/** The purposes of the files a guide page may name: uploads and imports, and committee texts. */
export const GUIDE_FILE_PURPOSES = ['guide/file', 'guide/committeeText'] as const;

/** A page title. */
export const guideTitleSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.guideTitleRequired() })
	.max(200, { error: () => m.guideTitleTooLong() });

/** A page's text as Markdown, from an assistant. */
export const guideMarkdownSchema = z
	.string()
	.max(400_000, { error: () => m.guideContentTooLong() });

/** A page's text as a TipTap document. */
export const guideContentSchema = guideDocumentSchema;

/** A conference as a scope reaches it: its series and the year it starts in. */
async function scopeTargetOf(conferenceId: string): Promise<ScopeTarget> {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { id: true, seriesId: true, startConference: true, timezone: true }
	});
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	return {
		id: conference.id,
		seriesId: conference.seriesId,
		year: conferenceYear({ start: conference.startConference, timezone: conference.timezone })
	};
}

/**
 * The scope of `kind` reaching the conference. Shared scopes need the conference to belong to a
 * series (INVALID_INPUT otherwise): they reach only conferences of a series.
 */
async function scopeFromKind({
	conferenceId,
	kind
}: {
	conferenceId: string;
	kind: GuideScopeKind;
}) {
	const target = await scopeTargetOf(conferenceId);
	if (kind !== 'CONFERENCE' && target.seriesId === null) {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideScopeNeedsSeries() });
	}
	return scopeFor({ kind, conference: target });
}

/**
 * The document to store from what the caller sent: TipTap JSON, or Markdown. Markdown replacing a
 * text with rich blocks (callouts, toggles, buttons, embeds) would drop them: refused (CONFLICT)
 * unless `replaceRichBlocks`.
 */
export function documentFrom({
	content,
	markdown,
	current,
	replaceRichBlocks
}: {
	content?: GuideDocument | null;
	markdown?: string | null;
	current?: unknown;
	replaceRichBlocks?: boolean;
}): GuideDocument | undefined {
	if (content && markdown) {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideContentEitherOr() });
	}
	if (content) return content;
	if (markdown === undefined || markdown === null) return undefined;
	const lost = current === undefined ? [] : richBlocksIn(parseGuideDocument(current));
	if (lost.length > 0 && !replaceRichBlocks) {
		throw apiError({
			code: 'CONFLICT',
			message: m.guideMarkdownDropsRichBlocks({ blocks: lost.join(', ') })
		});
	}
	return markdownToGuideDocument(markdown);
}

/**
 * Records the files a document names for the page, so the cleanup job keeps them. A file that is
 * not a guide file (an upload for another field, or none at all) is refused (INVALID_INPUT).
 */
async function recordPageFiles({
	tx,
	pageId,
	fileIds
}: {
	tx: Transaction;
	pageId: string;
	fileIds: readonly string[];
}) {
	if (fileIds.length === 0) return;
	const files = await tx.query.storedFile.findMany({
		where: { id: { in: [...fileIds] } },
		columns: { id: true, purpose: true }
	});
	const usable = new Set(
		files
			.filter((file) => (GUIDE_FILE_PURPOSES as readonly string[]).includes(file.purpose))
			.map((file) => file.id)
	);
	const unusable = fileIds.filter((id) => !usable.has(id));
	if (unusable.length > 0) {
		throw apiError({
			code: 'INVALID_INPUT',
			message: m.guideFileUnknown({ fileIds: unusable.join(', ') })
		});
	}
	await tx
		.insert(schema.guidePageFile)
		.values(fileIds.map((fileId) => ({ pageId, fileId })))
		.onConflictDoNothing();
}

/** Creates a general page with the scope of `kind` reaching the conference; returns its id. */
export async function createGuidePage({
	conferenceId,
	kind,
	title,
	content,
	editorId
}: {
	conferenceId: string;
	kind: GuideScopeKind;
	title: string;
	content: GuideDocument | undefined;
	editorId: string | null;
}) {
	const scope = await scopeFromKind({ conferenceId, kind });
	const document = content ?? EMPTY_DOCUMENT;
	const id = await db.transaction(async (tx) => {
		const created = await tx
			.insert(schema.guidePage)
			.values({ kind: 'GENERAL', ...scope, title, content: document, draftUpdatedById: editorId })
			.returning({ id: schema.guidePage.id })
			.then(assertFirstEntryExists);
		await recordPageFiles({ tx, pageId: created.id, fileIds: referencedFileIds(document) });
		return created.id;
	});
	guidePagePubsub.created();
	return id;
}

/**
 * The page of a committee or an agenda item, created (empty, titled after it) when it has none
 * yet; returns its id.
 */
export async function ensureOwnedGuidePage(
	owner:
		| { committeeId: string; editorId: string | null }
		| { agendaItemId: string; editorId: string | null }
) {
	const existing = await db.query.guidePage.findFirst({
		where:
			'committeeId' in owner
				? { committeeId: owner.committeeId }
				: { agendaItemId: owner.agendaItemId },
		columns: { id: true }
	});
	if (existing) return existing.id;
	const values =
		'committeeId' in owner
			? await db.query.committee
					.findFirst({
						where: { id: owner.committeeId },
						columns: { name: true, conferenceId: true }
					})
					.then(
						(committee) =>
							committee && {
								kind: 'COMMITTEE' as const,
								committeeId: owner.committeeId,
								conferenceId: committee.conferenceId,
								title: committee.name
							}
					)
			: await db.query.committeeAgendaItem
					.findFirst({
						where: { id: owner.agendaItemId },
						columns: { title: true },
						with: { committee: { columns: { conferenceId: true } } }
					})
					.then(
						(item) =>
							item && {
								kind: 'AGENDA_ITEM' as const,
								agendaItemId: owner.agendaItemId,
								conferenceId: item.committee.conferenceId,
								title: item.title
							}
					);
	if (!values) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	const [created] = await db
		.insert(schema.guidePage)
		.values({ ...values, content: EMPTY_DOCUMENT, draftUpdatedById: owner.editorId })
		.onConflictDoNothing()
		.returning({ id: schema.guidePage.id });
	if (created) {
		guidePagePubsub.created();
		return created.id;
	}
	// created by someone else at the same time
	const raced = await db.query.guidePage.findFirst({
		where:
			'committeeId' in owner
				? { committeeId: owner.committeeId }
				: { agendaItemId: owner.agendaItemId },
		columns: { id: true }
	});
	if (!raced) throw apiError({ code: 'CONFLICT', message: m.guidePageChangedMeanwhile() });
	return raced.id;
}

/**
 * Writes the draft's title and/or text; left out keeps them. Refused (CONFLICT) when the draft
 * changed since `expectedDraftUpdatedAt`, when given. Answers the draft's new revision.
 */
export async function updateGuidePageDraft({
	id,
	title,
	content,
	editorId,
	expectedDraftUpdatedAt
}: {
	id: string;
	title?: string | null;
	content?: GuideDocument;
	editorId: string | null;
	expectedDraftUpdatedAt?: Date | null;
}) {
	const draftUpdatedAt = await db.transaction(async (tx) => {
		const page = await tx.query.guidePage.findFirst({
			where: { id },
			columns: { draftUpdatedAt: true }
		});
		if (!page) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
		if (
			expectedDraftUpdatedAt &&
			page.draftUpdatedAt.getTime() !== expectedDraftUpdatedAt.getTime()
		) {
			throw apiError({ code: 'CONFLICT', message: m.guidePageChangedMeanwhile() });
		}
		const now = new Date();
		await tx
			.update(schema.guidePage)
			.set({
				title: title ?? undefined,
				content: content ?? undefined,
				draftUpdatedAt: now,
				draftUpdatedById: editorId
			})
			.where(whereRows({ table: schema.guidePage, filter: { id } }));
		if (content) await recordPageFiles({ tx, pageId: id, fileIds: referencedFileIds(content) });
		return now;
	});
	guidePagePubsub.updated(id);
	return draftUpdatedAt;
}

/**
 * Sets the draft's scope: `kind` reaching `conferenceId`. Committee and agenda item pages stay in
 * their conference (INVALID_INPUT).
 */
export async function setGuidePageScope({
	id,
	conferenceId,
	kind,
	editorId
}: {
	id: string;
	conferenceId: string;
	kind: GuideScopeKind;
	editorId: string | null;
}) {
	const page = await db.query.guidePage.findFirst({ where: { id }, columns: { kind: true } });
	if (!page) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	if (page.kind !== 'GENERAL') {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideOwnedPageScopeFixed() });
	}
	const scope = await scopeFromKind({ conferenceId, kind });
	await db
		.update(schema.guidePage)
		.set({ ...scope, draftUpdatedAt: new Date(), draftUpdatedById: editorId })
		.where(whereRows({ table: schema.guidePage, filter: { id } }));
	guidePagePubsub.updated(id);
}

/** The conferences (with a title) a scope reaches, of the ones that exist. */
async function conferencesReachedBy(scope: GuideScope) {
	const conferences = await db
		.select({
			id: schema.conference.id,
			title: schema.conference.title,
			seriesId: schema.conference.seriesId,
			year: conferenceYearSql(schema.conference)
		})
		.from(schema.conference)
		.where(
			scope.conferenceId !== null
				? eq(schema.conference.id, scope.conferenceId)
				: sql`${schema.conference.seriesId} is not null`
		)
		.orderBy(schema.conference.startConference);
	return conferences.filter((conference) =>
		scopeReaches({
			scope,
			conference: {
				id: conference.id,
				seriesId: conference.seriesId,
				year: Number(conference.year)
			}
		})
	);
}

/**
 * What publishing the page's draft would do: the conferences it then reaches, those it stops
 * reaching, and whether title or text change. For the editor's and an assistant's confirmation.
 */
export async function guidePagePublishPreview(id: string) {
	const page = await db.query.guidePage.findFirst({
		where: { id },
		with: { publishedVersion: { columns: { title: true, content: true } } }
	});
	if (!page) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	const draft: GuideScope = {
		seriesId: page.seriesId,
		year: page.year,
		conferenceId: page.conferenceId
	};
	const published: GuideScope | null = page.publishedVersionId
		? {
				seriesId: page.publishedSeriesId,
				year: page.publishedYear,
				conferenceId: page.publishedConferenceId
			}
		: null;
	const reaches = await conferencesReachedBy(draft);
	const before = published ? await conferencesReachedBy(published) : [];
	const reachedIds = new Set(reaches.map((conference) => conference.id));
	return {
		scope: scopeKindOf(draft),
		reaches: reaches.map(({ id, title }) => ({ id, title })),
		stopsReaching: before
			.filter((conference) => !reachedIds.has(conference.id))
			.map(({ id, title }) => ({ id, title })),
		firstPublish: page.publishedVersion === null,
		titleChanges: page.publishedVersion?.title !== page.title,
		textChanges:
			JSON.stringify(page.publishedVersion?.content ?? null) !== JSON.stringify(page.content),
		scopeChanges: published === null || !sameScope(draft, published)
	};
}

/**
 * Publishes the draft as a new version: participants read it from now on, wherever its scope
 * reaches. `render` makes the committee text of an agenda item page (Typst) before anything is
 * written; a render that fails fails the publish. Answers the version's id.
 */
export async function publishGuidePage({
	id,
	editorId,
	render
}: {
	id: string;
	editorId: string | null;
	render?: (page: {
		id: string;
		title: string;
		content: GuideDocument;
		agendaItemId: string;
	}) => Promise<string | null>;
}) {
	const page = await db.query.guidePage.findFirst({ where: { id } });
	if (!page) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	const content = parseGuideDocument(page.content);
	const pdfFileId =
		page.kind === 'AGENDA_ITEM' && page.agendaItemId && render
			? await render({ id, title: page.title, content, agendaItemId: page.agendaItemId })
			: null;
	const versionId = await db.transaction(async (tx) => {
		const [latest] = await tx
			.select({ number: sql<number>`coalesce(max(${schema.guidePageVersion.number}), 0)` })
			.from(schema.guidePageVersion)
			.where(eq(schema.guidePageVersion.pageId, id));
		const version = await tx
			.insert(schema.guidePageVersion)
			.values({
				pageId: id,
				number: Number(latest?.number ?? 0) + 1,
				title: page.title,
				content: page.content,
				seriesId: page.seriesId,
				year: page.year,
				conferenceId: page.conferenceId,
				publishedById: editorId,
				pdfFileId
			})
			.returning({ id: schema.guidePageVersion.id })
			.then(assertFirstEntryExists);
		await tx
			.update(schema.guidePage)
			.set({
				publishedVersionId: version.id,
				publishedSeriesId: page.seriesId,
				publishedYear: page.year,
				publishedConferenceId: page.conferenceId
			})
			.where(whereRows({ table: schema.guidePage, filter: { id } }));
		if (pdfFileId) await recordPageFiles({ tx, pageId: id, fileIds: [pdfFileId] });
		return version.id;
	});
	guidePageVersionPubsub.created();
	guidePagePubsub.updated(id);
	return versionId;
}

/** Copies a version's title, text and scope into the draft. */
export async function restoreGuidePageVersion({
	id,
	versionId,
	editorId
}: {
	id: string;
	versionId: string;
	editorId: string | null;
}) {
	const version = await db.query.guidePageVersion.findFirst({
		where: { id: versionId, pageId: id }
	});
	if (!version) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	await db
		.update(schema.guidePage)
		.set({
			title: version.title,
			content: version.content,
			seriesId: version.seriesId,
			year: version.year,
			conferenceId: version.conferenceId,
			draftUpdatedAt: new Date(),
			draftUpdatedById: editorId
		})
		.where(whereRows({ table: schema.guidePage, filter: { id } }));
	guidePagePubsub.updated(id);
}

/** The titles of the conferences whose published sidebar names the page. */
export async function sidebarsNaming(pageId: string) {
	const rows = await db
		.select({ title: schema.conference.title })
		.from(schema.guideOutline)
		.innerJoin(schema.conference, eq(schema.conference.id, schema.guideOutline.conferenceId))
		.where(
			sql`jsonb_path_exists(${schema.guideOutline.published}, '$.** ? (@.pageId == $id)', jsonb_build_object('id', ${pageId}::text))`
		);
	return rows.map((row) => row.title);
}

/**
 * Deletes a general page. Refused (CONFLICT) while a published sidebar names it; committee and
 * agenda item pages go with their committee or agenda item (INVALID_INPUT).
 */
export async function deleteGuidePage(id: string) {
	const page = await db.query.guidePage.findFirst({ where: { id }, columns: { kind: true } });
	if (!page) throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	if (page.kind !== 'GENERAL') {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideOwnedPageNotDeletable() });
	}
	const usedIn = await sidebarsNaming(id);
	if (usedIn.length > 0) {
		throw apiError({
			code: 'CONFLICT',
			message: m.guidePageStillInSidebar({ conferences: usedIn.join(', ') })
		});
	}
	await db.delete(schema.guidePage).where(whereRows({ table: schema.guidePage, filter: { id } }));
	guidePagePubsub.removed();
}

/** Download URLs of the guide files among `fileIds`. */
export async function guideFileUrls(fileIds: readonly string[]) {
	if (fileIds.length === 0) return [];
	const files = await db.query.storedFile.findMany({
		where: { id: { in: [...fileIds] }, purpose: { in: [...GUIDE_FILE_PURPOSES] } },
		columns: { id: true, key: true, fileName: true }
	});
	return Promise.all(
		files.map(async (file) => ({
			fileId: file.id,
			fileName: file.fileName,
			url: await downloadUrl(file)
		}))
	);
}

/** The ids of the pages whose draft or published scope reaches the conference. */
export async function guidePageIdsReaching(conferenceId: string) {
	const rows = await db
		.select({ id: schema.guidePage.id })
		.from(schema.guidePage)
		.where(draftOrPublishedReaches({ page: schema.guidePage, conferenceIds: [conferenceId] }));
	return rows.map((row) => row.id);
}

/**
 * The ids of the pages of `pageIds` that reach the conference: as published (published and its
 * published scope reaching it), or as drafts (the draft's scope reaching it).
 */
export async function pageIdsReachingOf({
	conferenceId,
	pageIds,
	as
}: {
	conferenceId: string;
	pageIds: readonly string[];
	as: 'published' | 'draft';
}) {
	if (pageIds.length === 0) return [];
	const page = schema.guidePage;
	const scope = as === 'published' ? publishedScope(page) : draftScope(page);
	const rows = await db
		.select({ id: page.id })
		.from(page)
		.where(
			and(
				inArray(page.id, [...pageIds]),
				as === 'published' ? isNotNull(page.publishedVersionId) : undefined,
				reachesAnyOf({ scope, conferenceIds: [conferenceId] })
			)
		);
	return rows.map((row) => row.id);
}
