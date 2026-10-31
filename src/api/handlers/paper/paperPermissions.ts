import { db } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	hasTeamPermission,
	isInOwnDelegation,
	isSystemAdmin,
	isTeamMemberOfConference,
	PAPER_ROLES,
	participatesIn,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists } from '@m1212e/rumble';
import { apiError } from '#api/services/errors';

type PaperType = (typeof schema.paper.$inferSelect)['type'];
type RoleKind = (typeof schema.conferenceRole.$inferSelect)['kind'];

/** Matches a Conference row where the user `id` is on the paper team (`PAPER_ROLES`). */
const paperTeamConference = (id: string) => ({
	teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } }
});

export function registerPaperAbilities() {
	abilityBuilder.paper.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Authors read and update their own papers, and delete one while it is still a draft.
	abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { authorParticipant: { userId: id } } } : undefined;
	});
	abilityBuilder.paper.allow('delete').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { authorParticipant: { userId: id }, status: 'DRAFT' } } : undefined;
	});

	// The paper team (every team role but the plain member) reads and updates the conference's
	// papers - the reviewer edit mode; verdicts go through reviews.
	abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { conference: paperTeamConference(id) } } : undefined;
	});

	// Project management deletes any paper of its conference, drafts or not.
	abilityBuilder.paper
		.allow('delete')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));

	// Supervisors read the submitted (non-draft) papers of the delegations they supervise.
	abilityBuilder.paper.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						delegation: { members: { supervisors: { participant: { userId: id } } } },
						status: { ne: 'DRAFT' }
					}
				}
			: undefined;
	});

	// Delegates read the submitted (non-draft) papers of their own delegation - nobody else's.
	abilityBuilder.paper.allow('read').when((ctx) => {
		const delegation = isInOwnDelegation(ctx);
		return delegation ? { where: { ...delegation, status: { ne: 'DRAFT' } } } : undefined;
	});
}

/** Refuses unless the caller is on the conference's paper team (`reviewPapers`) or an admin. */
export function assertCanReviewPapers({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	return assertTeamPermission({ ctx, conferenceId, permission: 'reviewPapers' });
}

/** Whether the caller passes `assertCanReviewPapers`, without throwing. */
export function canReviewPapers({ ctx, conferenceId }: { ctx: ApiContext; conferenceId: string }) {
	return hasTeamPermission({ ctx, conferenceId, permission: 'reviewPapers' });
}

/**
 * `assertCanReviewPapers` for the conference the agenda item belongs to; NOT_FOUND for an unknown
 * agenda item.
 */
export async function assertCanReviewAgendaItemPapers({
	ctx,
	agendaItemId
}: {
	ctx: ApiContext;
	agendaItemId: string;
}) {
	const agendaItem = await db.query.committeeAgendaItem
		.findFirst({
			where: { id: agendaItemId },
			columns: {},
			with: { committee: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);

	await assertCanReviewPapers({ ctx, conferenceId: agendaItem.committee.conferenceId });
}

/**
 * Refuses unless the caller may list the conference's papers: its paper team, its participants
 * (delegate, single participant or supervisor) or a system admin. Which papers each of them sees
 * is the read ability's business.
 */
export async function assertCanReadConferencePapers({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	if (await canReviewPapers({ ctx, conferenceId })) return;
	await assertParticipantOfConference({ ctx, conferenceId });
}

/**
 * Refuses unless the caller takes part in the conference (delegate, single participant or
 * supervisor), or is a system admin.
 */
async function assertParticipantOfConference({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (isSystemAdmin(ctx)) return;
	const participant = await db.query.user.findFirst({
		where: { id: caller, ...participatesIn({ id: conferenceId }) },
		columns: { id: true }
	});
	if (!participant) {
		throw apiError({ code: 'FORBIDDEN', message: m.accessDeniedParticipant() });
	}
}

/**
 * Why a delegation member may not write the paper, or undefined when they may. It goes by the
 * role their delegation holds once the assignment is released: a non-state actor sits in no
 * committee, so writes on any agenda item of the conference and may introduce itself across
 * committees (an introduction paper, without an agenda item); a nation writes on the agenda items
 * of the member's own committee only. Before the release the caller writes nothing: answering
 * differently per agenda item or paper type would tell them the committee and role their read
 * rules still mask.
 */
export function paperWriteRefusal({
	member,
	paper
}: {
	member: {
		assignmentReleased: boolean;
		roleKind: RoleKind | null;
		assignedCommitteeId: string | null;
	};
	paper: {
		type: PaperType;
		/** The agenda item's committee, or null for a paper without one. */
		agendaItemCommitteeId: string | null;
	};
}) {
	const isNSA = member.roleKind === 'NON_STATE_ACTOR';
	if (!member.assignmentReleased || !(isNSA || member.roleKind === 'NATION')) {
		return apiError({ code: 'FORBIDDEN', message: m.paperNotYetAssigned() });
	}
	return paper.type === 'INTRODUCTION_PAPER'
		? introductionPaperRefusal({ isNSA, agendaItemCommitteeId: paper.agendaItemCommitteeId })
		: agendaItemPaperRefusal({
				isNSA,
				assignedCommitteeId: member.assignedCommitteeId,
				agendaItemCommitteeId: paper.agendaItemCommitteeId
			});
}

/** An introduction paper: non-state actors only, and never on an agenda item. */
function introductionPaperRefusal({
	isNSA,
	agendaItemCommitteeId
}: {
	isNSA: boolean;
	agendaItemCommitteeId: string | null;
}) {
	if (!isNSA)
		return apiError({ code: 'FORBIDDEN', message: m.paperIntroductionOnlyNonStateActors() });
	if (agendaItemCommitteeId) {
		return apiError({ code: 'INVALID_INPUT', message: m.paperIntroductionWithoutAgendaItem() });
	}
	return undefined;
}

/** Any other paper: on an agenda item, of the member's own committee unless a non-state actor. */
function agendaItemPaperRefusal({
	isNSA,
	assignedCommitteeId,
	agendaItemCommitteeId
}: {
	isNSA: boolean;
	assignedCommitteeId: string | null;
	agendaItemCommitteeId: string | null;
}) {
	if (!agendaItemCommitteeId)
		return apiError({ code: 'INVALID_INPUT', message: m.paperAgendaItemRequired() });
	if (!isNSA && agendaItemCommitteeId !== assignedCommitteeId) {
		return apiError({ code: 'FORBIDDEN', message: m.paperOnlyOwnCommittee() });
	}
	return undefined;
}

/**
 * Refuses unless the caller writes the paper as its author, for a delegation they are a member of
 * in that conference, on one of that conference's agenda items (or none, for an introduction
 * paper), and the agenda item and paper type fit the delegation's role (`paperWriteRefusal`).
 * Every one of these arrives as an argument, so every one is checked. Only checked here, not in
 * the database: a member moved to another committee later keeps the papers they wrote. Returns
 * the caller's participant row, which the paper is written under.
 */
export async function assertCanCreatePaper({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: {
		conferenceId: string;
		authorId: string;
		delegationId: string;
		agendaItemId?: string | null;
		type: PaperType;
	};
}) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (args.authorId !== caller) {
		throw apiError({ code: 'FORBIDDEN', message: m.paperOnlyOwnName() });
	}
	const membership = await db.query.delegationMember.findFirst({
		where: {
			delegationId: args.delegationId,
			participant: { userId: caller, conferenceId: args.conferenceId }
		},
		columns: { conferenceParticipantId: true, assignedCommitteeId: true },
		with: {
			delegation: {
				columns: {},
				with: {
					assignedRole: { columns: { kind: true } },
					conference: { columns: { assignmentReleased: true } }
				}
			}
		}
	});
	if (!membership) {
		throw apiError({ code: 'FORBIDDEN', message: m.paperOnlyOwnDelegation() });
	}
	const agendaItem = args.agendaItemId
		? await db.query.committeeAgendaItem
				.findFirst({
					where: { id: args.agendaItemId, committee: { conferenceId: args.conferenceId } },
					columns: { committeeId: true }
				})
				.then(assertFindFirstExists)
		: undefined;
	const refusal = paperWriteRefusal({
		member: {
			assignmentReleased: membership.delegation.conference.assignmentReleased,
			roleKind: membership.delegation.assignedRole?.kind ?? null,
			assignedCommitteeId: membership.assignedCommitteeId
		},
		paper: { type: args.type, agendaItemCommitteeId: agendaItem?.committeeId ?? null }
	});
	if (refusal) throw refusal;
	return { authorParticipantId: membership.conferenceParticipantId };
}

/**
 * Refuses unless the paper exists and the caller may update it (the row's update ability: its
 * author, the paper team, a system admin).
 */
export async function assertCanUpdatePaper({ ctx, paperId }: { ctx: ApiContext; paperId: string }) {
	ctx.mustBeLoggedIn();
	await db.query.paper
		.findFirst({
			...(await ctx.abilities.paper.filter('update')).merge({ where: { id: paperId } }).query
				.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}
