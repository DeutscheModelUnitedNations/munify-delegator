import { db, schema } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	GUIDE_ROLES,
	hasTeamPermission,
	hop,
	isSystemAdmin,
	NOTHING,
	systemAdmin,
	teamConferenceIds,
	type RuleArgs
} from '#api/services/authHelper/rules';
import { callerFacts, liveWhere } from '#api/services/authHelper/callerFacts';
import { assertAllowed } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import type { GuideReader } from '#lib/guide/outline';
import { readerOfPart } from '#lib/guide/reader';
import { draftOrPublishedReaches, editableIn } from './guideReach';

/**
 * Who writes guide pages (`docs/plans/guide.md`, "Permissions"): whoever holds `editGuide`
 * (project management, content lead) in a conference a page reaches. A page shared beyond one
 * conference is changed and published by the guide team of any conference it reaches, as long as
 * its draft and what is published of it both reach one of theirs. Readers never read the table:
 * their guide comes from `myGuide` and `guideReaderPage`, which check `guideReaderOf`.
 */

/** The conferences in which the caller holds `editGuide`; `'all'` for a system admin. */
function guideConferenceIds(args: RuleArgs) {
	return teamConferenceIds({ ...args, roles: GUIDE_ROLES });
}

type PageCondition = (args: {
	page: typeof schema.guidePage;
	conferenceIds: readonly string[];
}) => ReturnType<typeof editableIn>;

/**
 * A filter on pages built from the conferences the caller writes the guide of: everything for a
 * system admin, undefined (nobody) for an anonymous caller.
 */
function pageFilter({ args, condition }: { args: RuleArgs; condition: PageCondition }) {
	const ids = guideConferenceIds(args);
	if (ids === undefined) return undefined;
	if (ids === 'all') return {};
	return ids.length === 0
		? NOTHING
		: { RAW: (page: typeof schema.guidePage) => condition({ page, conferenceIds: ids }) };
}

export function registerGuidePageAbilities() {
	abilityBuilder.guidePage.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.guidePage
		.allow('read')
		.when(liveWhere((args) => pageFilter({ args, condition: draftOrPublishedReaches })));
	abilityBuilder.guidePage
		.allow(['update', 'delete'])
		.when(liveWhere((args) => pageFilter({ args, condition: editableIn })));

	// A page's versions: whoever reads the page.
	abilityBuilder.guidePageVersion.allow('read').when(systemAdmin);
	abilityBuilder.guidePageVersion
		.allow('read')
		.when(
			liveWhere((args) =>
				hop(pageFilter({ args, condition: draftOrPublishedReaches }), (page) => ({ page }))
			)
		);
	// Which files a page names is bookkeeping for the cleanup job.
	abilityBuilder.guidePageFile.allow('read').when(systemAdmin);
}

/** Refuses (FORBIDDEN) unless the caller holds `editGuide` in the conference. */
export async function assertCanEditGuideOf({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'editGuide' });
}

/** Refuses (NOT_FOUND) unless the caller may change the page (`editableIn`). */
export async function assertCanEditGuidePage({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'guidePage', action: 'update', id });
}

/** Refuses (NOT_FOUND) unless the caller may delete the page (`editableIn`). */
export async function assertCanDeleteGuidePage({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'guidePage', action: 'delete', id });
}

/**
 * Refuses (NOT_FOUND) unless the committee exists and the caller holds `editGuide` in its
 * conference. Answers the conference.
 */
export async function assertCanEditGuideOfCommittee({
	ctx,
	committeeId
}: {
	ctx: ApiContext;
	committeeId: string;
}) {
	const committee = await db.query.committee.findFirst({
		where: { id: committeeId },
		columns: { conferenceId: true }
	});
	if (
		!committee ||
		!(await hasTeamPermission({
			ctx,
			conferenceId: committee.conferenceId,
			permission: 'editGuide'
		}))
	) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
	return committee.conferenceId;
}

/** As `assertCanEditGuideOfCommittee`, for an agenda item. */
export async function assertCanEditGuideOfAgendaItem({
	ctx,
	agendaItemId
}: {
	ctx: ApiContext;
	agendaItemId: string;
}) {
	const item = await db.query.committeeAgendaItem.findFirst({
		where: { id: agendaItemId },
		columns: { id: true },
		with: { committee: { columns: { conferenceId: true } } }
	});
	if (
		!item ||
		!(await hasTeamPermission({
			ctx,
			conferenceId: item.committee.conferenceId,
			permission: 'editGuide'
		}))
	) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
	return item.committee.conferenceId;
}

/** The caller's id, for the `…UpdatedById` columns; empty for nobody. */
export function editorIdOf(ctx: ApiContext) {
	return ctx.oidc.user?.sub ?? null;
}

// --- Readers ----------------------------------------------------------------------------------

/**
 * How the caller reads the conference's guide, or undefined when they may not (yet):
 *
 * - the team (any role) and system admins read all of it, drafts too (`preview`), always;
 * - everybody else only once the conference has published its guide and released the roles:
 *   supervisors all of it, delegation members and single participants what is for them.
 */
export async function guideReaderOf({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}): Promise<{ reader: GuideReader; preview: boolean } | undefined> {
	ctx.mustBeLoggedIn();
	if (await hasTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' })) {
		return { reader: { kind: 'everything' }, preview: true };
	}
	// an assistant reads only what the team does
	if (ctx.mcp || isSystemAdmin(ctx)) return undefined;
	const part = await releasedPartIn({ ctx, conferenceId });
	const reader = part && readerOfPart(part);
	return reader ? { reader, preview: false } : undefined;
}

/**
 * The caller's part in the conference, once its roles are released and its guide is published;
 * undefined before, or without a part.
 */
async function releasedPartIn({ ctx, conferenceId }: { ctx: ApiContext; conferenceId: string }) {
	const facts = await callerFacts(ctx);
	if (!facts.conferences.get(conferenceId)?.assignmentReleased) return undefined;
	return db.query.conferenceParticipant.findFirst({
		where: {
			conferenceId,
			userId: ctx.mustBeLoggedIn().sub,
			conference: { guidePublished: true }
		},
		columns: { id: true },
		with: {
			conferenceSupervisor: { columns: { id: true } },
			delegationMember: {
				columns: { assignedCommitteeId: true },
				with: {
					delegation: {
						columns: { id: true },
						with: { assignedRole: { columns: { kind: true } } }
					}
				}
			},
			singleParticipant: { columns: { assignedRoleId: true } }
		}
	});
}

/** Refuses (FORBIDDEN) a preview (drafts, another reader's view) to anybody but the team. */
export function assertMayPreview(access: { preview: boolean } | undefined) {
	if (!access?.preview) {
		throw apiError({ code: 'FORBIDDEN', message: m.guidePreviewTeamOnly() });
	}
}
