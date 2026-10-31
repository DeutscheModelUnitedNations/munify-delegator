import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	isTeamMemberOf,
	PAPER_ROLES,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/** The abilities of paper reviews: written through `createPaperReview`, never updated. */
export function registerPaperReviewAbilities() {
	abilityBuilder.paperReview.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Authors read the reviews of their own papers.
	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { paperVersion: { paper: { authorParticipant: { userId: id } } } } }
			: undefined;
	});

	// The paper team (`reviewPapers`: reviewer, project management, participant care, team
	// coordinator, content lead) reads the reviews of the conference's papers.
	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const conference = isTeamMemberOf({ ctx, roles: PAPER_ROLES });
		return conference ? { where: { paperVersion: { paper: { conference } } } } : undefined;
	});
}

/**
 * Refuses (NOT_FOUND) unless the paper exists in a conference where the caller holds
 * `reviewPapers` (reviewer, project management, participant care, team coordinator, content lead).
 * Reading the paper is not enough to review it. Returns the caller's id, the review's reviewer.
 */
export async function assertCanReviewPaper({ ctx, paperId }: { ctx: ApiContext; paperId: string }) {
	const paper = await db.query.paper.findFirst({
		where: {
			id: paperId,
			delegation: { conference: teamConference({ ctx, permission: 'reviewPapers' }) }
		},
		columns: { id: true }
	});
	if (!paper) throw apiError({ code: 'NOT_FOUND', message: m.reviewOnlyReviewers() });
	return { reviewerId: ctx.mustBeLoggedIn().sub };
}
