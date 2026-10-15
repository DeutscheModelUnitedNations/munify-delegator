import { db, schema } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	assertAllowedRow,
	assertParticipantOfConference,
	assertTeamRole,
	hasTeamRole,
	isInOwnDelegation,
	isTeamMemberOfConference,
	PAPER_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists } from '@m1212e/rumble';
import { apiError } from '$api/services/errors/apiError';

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
	return assertTeamRole(ctx, conferenceId, PAPER_ROLES);
}

/** The non-throwing form of `assertCanReviewPapers`. */
export function canReviewPapers(ctx: ApiContext, conferenceId: string) {
	return hasTeamRole(ctx, conferenceId, PAPER_ROLES);
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
 * Any participant of the conference - delegate, single participant or supervisor - or an admin:
 * who may read the conference's papers outside the reviewer views.
 */
export function assertCanReadConferencePapers(ctx: ApiContext, conferenceId: string) {
	return assertParticipantOfConference(ctx, conferenceId);
}

/**
 * A paper is written by the caller, for a delegation they are a member of in that conference, on
 * one of that conference's agenda items (or none, for an introduction paper). All three arrive as
 * arguments, so all three are checked: the author cannot be somebody else, and the delegation and
 * agenda item cannot belong to another conference. Answers with the caller's participant row,
 * which the paper is written under.
 */
export async function assertCanCreatePaper(
	ctx: ApiContext,
	args: {
		conferenceId: string;
		authorId: string;
		delegationId: string;
		agendaItemId?: string | null;
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
		columns: { conferenceParticipantId: true }
	});
	if (!membership) {
		throw apiError('FORBIDDEN', m.paperOnlyOwnDelegation());
	}
	if (args.agendaItemId) {
		await db.query.committeeAgendaItem
			.findFirst({
				where: { id: args.agendaItemId, committee: { conferenceId: args.conferenceId } },
				columns: { id: true }
			})
			.then(assertFindFirstExists);
	}
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

/** Refuses unless the paper exists and the caller may delete it. */
export async function assertCanDeletePaper(ctx: ApiContext, paperId: string) {
	await assertAllowedRow(
		schema.paper,
		(await ctx.abilities.paper.filter('delete')).merge({ where: { id: paperId } }).sql.where
	);
}
