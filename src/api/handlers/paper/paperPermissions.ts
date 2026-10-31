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
type PaperStatus = (typeof schema.paper.$inferSelect)['status'];
type RoleKind = (typeof schema.conferenceRole.$inferSelect)['kind'];

/**
 * The abilities of papers. Their versions and reviews follow the paper
 * (`paperVersionPermissions.ts`, `paperReviewPermissions.ts`).
 */
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

	// The paper team (`reviewPapers`: reviewer, project management, participant care, team
	// coordinator, content lead) reads and updates the conference's papers, drafts included - the
	// reviewer edit mode. Only the text: the status is the author's (`assertCanUpdatePaper`), the
	// verdicts go through reviews.
	abilityBuilder.paper
		.allow(['read', 'update'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PAPER_ROLES })));

	// Project management deletes any paper of its conference, drafts or not.
	abilityBuilder.paper
		.allow('delete')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));

	// Supervisors read the submitted (non-draft) papers of the delegations they supervise.
	abilityBuilder.paper.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { ...supervisedDelegationOf(id), status: { ne: 'DRAFT' } } } : undefined;
	});

	// Delegates read the submitted (non-draft) papers of their own delegation - nobody else's.
	abilityBuilder.paper.allow('read').when((ctx) => {
		const delegation = isInOwnDelegation(ctx);
		return delegation ? { where: { ...delegation, status: { ne: 'DRAFT' } } } : undefined;
	});
}

/** Matches a Paper row of a delegation with a member the user `id` supervises. */
export function supervisedDelegationOf(id: string) {
	return { delegation: { members: { supervisors: { participant: { userId: id } } } } };
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `reviewPapers` in the conference (reviewer, project
 * management, participant care, team coordinator, content lead).
 */
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
 * Refuses (FORBIDDEN) unless the caller may list the conference's papers: its paper team
 * (`reviewPapers`), its participants (delegate, single participant or supervisor) or a system
 * admin. Which papers each of them sees is the read ability's business.
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
 * Refuses (FORBIDDEN) unless the caller takes part in the conference (delegate, single participant
 * or supervisor), or is a system admin.
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
 * Refuses unless the caller is a member of the delegation the paper is for (FORBIDDEN), the agenda
 * item is one of that delegation's conference (INVALID_INPUT; none for an introduction paper), and
 * the agenda item and paper type fit the delegation's role (`paperWriteRefusal`). The author is
 * always the caller and the conference the delegation's, so neither is an argument. Only checked
 * here, not in the database: a member moved to another committee later keeps the papers they
 * wrote. Returns the caller's participant row, which the paper is written under, and the
 * conference.
 */
export async function assertCanCreatePaper({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { delegationId: string; agendaItemId?: string | null; type: PaperType };
}) {
	const caller = ctx.mustBeLoggedIn().sub;
	const membership = await db.query.delegationMember.findFirst({
		where: { delegationId: args.delegationId, participant: { userId: caller } },
		columns: { conferenceParticipantId: true, assignedCommitteeId: true },
		with: {
			delegation: {
				columns: {},
				with: {
					assignedRole: { columns: { kind: true } },
					conference: { columns: { id: true, assignmentReleased: true } }
				}
			}
		}
	});
	if (!membership) {
		throw apiError({ code: 'FORBIDDEN', message: m.paperOnlyOwnDelegation() });
	}
	const conference = membership.delegation.conference;
	const agendaItemCommitteeId = args.agendaItemId
		? await agendaItemCommitteeIn({ agendaItemId: args.agendaItemId, conferenceId: conference.id })
		: null;
	const refusal = paperWriteRefusal({
		member: {
			assignmentReleased: conference.assignmentReleased,
			roleKind: membership.delegation.assignedRole?.kind ?? null,
			assignedCommitteeId: membership.assignedCommitteeId
		},
		paper: { type: args.type, agendaItemCommitteeId }
	});
	if (refusal) throw refusal;
	return { authorParticipantId: membership.conferenceParticipantId, conferenceId: conference.id };
}

/** The committee of the agenda item; refuses (INVALID_INPUT) one of another conference. */
async function agendaItemCommitteeIn({
	agendaItemId,
	conferenceId
}: {
	agendaItemId: string;
	conferenceId: string;
}) {
	const agendaItem = await db.query.committeeAgendaItem.findFirst({
		where: { id: agendaItemId, committee: { conferenceId } },
		columns: { committeeId: true }
	});
	if (!agendaItem) {
		throw apiError({ code: 'INVALID_INPUT', message: m.paperAgendaItemOtherConference() });
	}
	return agendaItem.committeeId;
}

/**
 * Refuses (NOT_FOUND) unless the caller may update the paper (the row's update ability: its
 * author, the paper team, a system admin). Only the author sets the status (FORBIDDEN otherwise):
 * the team edits the text and keeps the status, its verdicts go through reviews.
 */
export async function assertCanUpdatePaper({
	ctx,
	paperId,
	status
}: {
	ctx: ApiContext;
	paperId: string;
	status: PaperStatus | null | undefined;
}) {
	const caller = ctx.mustBeLoggedIn().sub;
	const paper = await db.query.paper
		.findFirst({
			...(await ctx.abilities.paper.filter('update')).merge({ where: { id: paperId } }).query
				.single,
			columns: { id: true },
			with: { authorParticipant: { columns: { userId: true } } }
		})
		.then(assertFindFirstExists);
	if (status != null && paper.authorParticipant.userId !== caller) {
		throw apiError({ code: 'FORBIDDEN', message: m.paperStatusOnlyThroughReview() });
	}
}
