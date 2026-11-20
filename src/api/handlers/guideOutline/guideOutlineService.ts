import { eq, sql } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { guideOutlinePubsub, guideOutlineVersionPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import {
	EMPTY_OUTLINE,
	outlinePageIds,
	outlineRoleIds,
	outlineSchema,
	parseOutline,
	type Outline
} from '#lib/guide/outline';
import { z } from 'zod';
import { guidePageIdsReaching, pageIdsReachingOf } from '../guidePage/guidePageService';

/** The outline argument: a whole sidebar (`#lib/guide/outline`). */
export const outlineArgSchema = z.unknown().transform((value, ctx) => {
	const parsed = outlineSchema.safeParse(value);
	if (!parsed.success) {
		ctx.addIssue({ code: 'custom', message: m.guideOutlineInvalid() });
		return z.NEVER;
	}
	const sectionIds = parsed.data.sections.map((section) => section.id);
	if (new Set(sectionIds).size !== sectionIds.length) {
		ctx.addIssue({ code: 'custom', message: m.guideOutlineInvalid() });
		return z.NEVER;
	}
	return parsed.data;
});

/**
 * Checks what an outline names against the conference: every page reaches it (as a draft or
 * published) and every custom role is one of its custom roles (INVALID_INPUT otherwise).
 */
async function assertOutlineFits({
	conferenceId,
	outline
}: {
	conferenceId: string;
	outline: Outline;
}) {
	const reaching = new Set(await guidePageIdsReaching(conferenceId));
	const strangers = outlinePageIds(outline).filter((id) => !reaching.has(id));
	if (strangers.length > 0) {
		throw apiError({
			code: 'INVALID_INPUT',
			message: m.guideOutlinePagesElsewhere({ pageIds: strangers.join(', ') })
		});
	}
	const roleIds = outlineRoleIds(outline);
	if (roleIds.length === 0) return;
	const roles = await db.query.conferenceRole.findMany({
		where: { id: { in: roleIds }, conferenceId, kind: 'CUSTOM' },
		columns: { id: true }
	});
	if (roles.length !== roleIds.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideOutlineRolesElsewhere() });
	}
}

/** Writes the conference's sidebar draft, creating its outline on the first change. */
export async function saveOutlineDraft({
	conferenceId,
	outline,
	editorId
}: {
	conferenceId: string;
	outline: Outline;
	editorId: string | null;
}) {
	await assertOutlineFits({ conferenceId, outline });
	const [row] = await db
		.insert(schema.guideOutline)
		.values({ conferenceId, draft: outline, draftUpdatedById: editorId })
		.onConflictDoUpdate({
			target: schema.guideOutline.conferenceId,
			set: { draft: outline, draftUpdatedById: editorId, updatedAt: new Date() }
		})
		.returning({ id: schema.guideOutline.id, createdAt: schema.guideOutline.createdAt });
	if (row) guideOutlinePubsub.updated(row.id);
	guideOutlinePubsub.created();
	return row?.id;
}

/** The pages an outline names that are not published in the conference, by title. */
async function unpublishedPagesOf({
	conferenceId,
	outline
}: {
	conferenceId: string;
	outline: Outline;
}) {
	const named = outlinePageIds(outline);
	const published = new Set(
		await pageIdsReachingOf({ conferenceId, pageIds: named, as: 'published' })
	);
	const missing = named.filter((id) => !published.has(id));
	if (missing.length === 0) return [];
	const pages = await db.query.guidePage.findMany({
		where: { id: { in: missing } },
		columns: { title: true }
	});
	return pages.map((page) => page.title);
}

/**
 * Publishes the conference's sidebar draft as a new version. Every page it names has to be
 * published and reach the conference (CONFLICT, naming them, otherwise); committee and agenda item
 * pages of the template show once they are published.
 */
export async function publishOutline({
	conferenceId,
	editorId
}: {
	conferenceId: string;
	editorId: string | null;
}) {
	const row = await db.query.guideOutline.findFirst({ where: { conferenceId } });
	if (!row) throw apiError({ code: 'NOT_FOUND', message: m.guideOutlineMissing() });
	const outline = parseOutline(row.draft);
	await assertOutlineFits({ conferenceId, outline });
	const unpublished = await unpublishedPagesOf({ conferenceId, outline });
	if (unpublished.length > 0) {
		throw apiError({
			code: 'CONFLICT',
			message: m.guideOutlineUnpublishedPages({ pages: unpublished.join(', ') })
		});
	}
	const now = new Date();
	await db.transaction(async (tx) => {
		const [latest] = await tx
			.select({ number: sql<number>`coalesce(max(${schema.guideOutlineVersion.number}), 0)` })
			.from(schema.guideOutlineVersion)
			.where(eq(schema.guideOutlineVersion.outlineId, row.id));
		await tx.insert(schema.guideOutlineVersion).values({
			outlineId: row.id,
			number: Number(latest?.number ?? 0) + 1,
			outline,
			publishedById: editorId
		});
		await tx
			.update(schema.guideOutline)
			.set({ published: outline, publishedAt: now, publishedById: editorId })
			.where(whereRows({ table: schema.guideOutline, filter: { id: row.id } }));
	});
	guideOutlineVersionPubsub.created();
	guideOutlinePubsub.updated(row.id);
}

/** Copies a published version of the sidebar into the draft. */
export async function restoreOutlineVersion({
	conferenceId,
	versionId,
	editorId
}: {
	conferenceId: string;
	versionId: string;
	editorId: string | null;
}) {
	const version = await db.query.guideOutlineVersion.findFirst({
		where: { id: versionId, guideOutline: { conferenceId } },
		columns: { outline: true, outlineId: true }
	});
	if (!version) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	await db
		.update(schema.guideOutline)
		.set({ draft: version.outline, draftUpdatedById: editorId, updatedAt: new Date() })
		.where(whereRows({ table: schema.guideOutline, filter: { id: version.outlineId } }));
	guideOutlinePubsub.updated(version.outlineId);
}

/** The draft (or published) outline of a conference, empty when it has none. */
export async function outlineOf({
	conferenceId,
	draft
}: {
	conferenceId: string;
	draft: boolean;
}): Promise<Outline> {
	const row = await db.query.guideOutline.findFirst({
		where: { conferenceId },
		columns: { draft: true, published: true }
	});
	if (!row) return EMPTY_OUTLINE;
	return parseOutline(draft ? row.draft : row.published);
}
