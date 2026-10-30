import { db } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertParticipantOfConference,
	assertTeamPermission,
	hasTeamPermission,
	isInOwnDelegation,
	isTeamMemberOfConference,
	PAPER_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin,
	userId,
	where
} from '#api/services/authHelper';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists } from '@m1212e/rumble';
import { apiError } from '#api/services/errors/apiError';

type PaperType = (typeof schema.paper.$inferSelect)['type'];
type RoleKind = (typeof schema.conferenceRole.$inferSelect)['kind'];

const paperTeam = (id: string) => ({
	teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } }
});

export function registerPaperAbilities() {
	// Ported from abilities/entities/paper/paper.ts
	abilityBuilder.paper.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Authors see and edit their own papers, and may delete one while it is still a draft.
	abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { authorParticipant: { userId: id } } } : undefined;
	});
	abilityBuilder.paper.allow('delete').when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { authorParticipant: { userId: id }, status: 'DRAFT' } } : undefined;
	});

	// Reviewers and conference management see the conference's papers and may edit their text (the
	// reviewer edit mode); verdicts go through reviews.
	abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { conference: paperTeam(id) } } : undefined;
	});

	// Only project management deletes somebody else's paper.
	abilityBuilder.paper
		.allow('delete')
		.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

	// Supervisors see the submitted papers of the delegations they supervise.
	abilityBuilder.paper.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: {
						delegation: { members: { supervisors: { participant: { userId: id } } } },
						status: { ne: 'DRAFT' }
					}
				}
			: undefined;
	});

	// Delegates see the submitted papers of their own delegation - nobody else's.
	abilityBuilder.paper.allow('read').when((ctx) => {
		const delegation = isInOwnDelegation(ctx);
		return delegation ? { where: { ...delegation, status: { ne: 'DRAFT' } } } : undefined;
	});
}

/** Reviewers and conference management of the conference, or a system admin. */
export function assertCanReviewPapers(ctx: ApiContext, conferenceId: string) {
	return assertTeamPermission(ctx, conferenceId, 'reviewPapers');
}

/** The non-throwing form of `assertCanReviewPapers`. */
export function canReviewPapers(ctx: ApiContext, conferenceId: string) {
	return hasTeamPermission(ctx, conferenceId, 'reviewPapers');
}

/** The reviewer check for the conference an agenda item belongs to. */
export async function assertCanReviewAgendaItemPapers(ctx: ApiContext, agendaItemId: string) {
	const agendaItem = await db.query.committeeAgendaItem
		.findFirst({
			where: { id: agendaItemId },
			columns: {},
			with: { committee: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);

	await assertCanReviewPapers(ctx, agendaItem.committee.conferenceId);
}

/**
 * The reviewers and conference management of the conference, any of its participants (delegate,
 * single participant or supervisor), or an admin: who may list the conference's papers. Which
 * papers each of them sees is the read ability's business.
 */
export async function assertCanReadConferencePapers(ctx: ApiContext, conferenceId: string) {
	if (await canReviewPapers(ctx, conferenceId)) return;
	await assertParticipantOfConference(ctx, conferenceId);
}

/**
 * What a delegation member may write, by the role their delegation holds once the assignment is
 * released: a non-state actor sits in no committee, so writes on any agenda item of the conference
 * and may introduce itself across committees (an introduction paper, without an agenda item); a
 * nation writes on the agenda items of the member's own committee only. Before the release the
 * caller writes nothing: answering differently per agenda item or paper type would tell them the
 * committee and role their read rules still mask.
 */
export function paperRefusal(
	member: {
		assignmentReleased: boolean;
		roleKind: RoleKind | null;
		assignedCommitteeId: string | null;
	},
	paper: {
		type: PaperType;
		/** The agenda item's committee, or null for a paper without one. */
		agendaItemCommitteeId: string | null;
	}
) {
	const isNSA = member.roleKind === 'NON_STATE_ACTOR';
	if (!member.assignmentReleased || !(isNSA || member.roleKind === 'NATION')) {
		return apiError('FORBIDDEN', m.paperNotYetAssigned());
	}
	return paper.type === 'INTRODUCTION_PAPER'
		? introductionPaperRefusal(isNSA, paper.agendaItemCommitteeId)
		: agendaItemPaperRefusal(isNSA, member.assignedCommitteeId, paper.agendaItemCommitteeId);
}

/** An introduction paper: non-state actors only, and never on an agenda item. */
function introductionPaperRefusal(isNSA: boolean, agendaItemCommitteeId: string | null) {
	if (!isNSA) return apiError('FORBIDDEN', m.paperIntroductionOnlyNonStateActors());
	if (agendaItemCommitteeId) {
		return apiError('INVALID_INPUT', m.paperIntroductionWithoutAgendaItem());
	}
	return undefined;
}

/** Any other paper: on an agenda item, of the member's own committee unless a non-state actor. */
function agendaItemPaperRefusal(
	isNSA: boolean,
	assignedCommitteeId: string | null,
	agendaItemCommitteeId: string | null
) {
	if (!agendaItemCommitteeId) return apiError('INVALID_INPUT', m.paperAgendaItemRequired());
	if (!isNSA && agendaItemCommitteeId !== assignedCommitteeId) {
		return apiError('FORBIDDEN', m.paperOnlyOwnCommittee());
	}
	return undefined;
}

/**
 * A paper is written by the caller, for a delegation they are a member of in that conference, on
 * one of that conference's agenda items (or none, for an introduction paper). All of it arrives as
 * arguments, so all of it is checked: the author cannot be somebody else, the delegation and
 * agenda item cannot belong to another conference, and the agenda item and the paper type have to
 * fit the delegation's role (`paperRefusal`). Only checked here, not in the database: a member
 * moved to another committee later keeps the papers they wrote. Answers with the caller's
 * participant row, which the paper is written under.
 */
export async function assertCanCreatePaper(
	ctx: ApiContext,
	args: {
		conferenceId: string;
		authorId: string;
		delegationId: string;
		agendaItemId?: string | null;
		type: PaperType;
	}
) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (args.authorId !== caller) {
		throw apiError('FORBIDDEN', m.paperOnlyOwnName());
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
		throw apiError('FORBIDDEN', m.paperOnlyOwnDelegation());
	}
	const agendaItem = args.agendaItemId
		? await db.query.committeeAgendaItem
				.findFirst({
					where: { id: args.agendaItemId, committee: { conferenceId: args.conferenceId } },
					columns: { committeeId: true }
				})
				.then(assertFindFirstExists)
		: undefined;
	const refusal = paperRefusal(
		{
			assignmentReleased: membership.delegation.conference.assignmentReleased,
			roleKind: membership.delegation.assignedRole?.kind ?? null,
			assignedCommitteeId: membership.assignedCommitteeId
		},
		{ type: args.type, agendaItemCommitteeId: agendaItem?.committeeId ?? null }
	);
	if (refusal) throw refusal;
	return { authorParticipantId: membership.conferenceParticipantId };
}

/** Refuses unless the paper exists and the caller may update it (authors, reviewers, admins). */
export async function assertCanUpdatePaper(ctx: ApiContext, paperId: string) {
	ctx.mustBeLoggedIn();
	await db.query.paper
		.findFirst({
			...(await ctx.abilities.paper.filter('update')).merge({ where: { id: paperId } }).query
				.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}
