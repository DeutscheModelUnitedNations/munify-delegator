import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import { PAPER_ROLES, systemAdmin, teamConference } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

export function registerPaperReviewAbilities() {
	// Ported from abilities/entities/paper/paperReview.ts
	abilityBuilder.paperReview.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { paperVersion: { paper: { authorParticipant: { userId: id } } } } }
			: undefined;
	});

	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						paperVersion: {
							paper: {
								conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
							}
						}
					}
				}
			: undefined;
	});
}

/**
 * Rejects the review unless the paper exists in a conference whose papers the caller reviews.
 * Reviewing is a reviewer's action; reading the paper is not enough.
 */
export async function assertCanReviewPaper(ctx: ApiContext, paperId: string) {
	const paper = await db.query.paper.findFirst({
		where: { id: paperId, delegation: { conference: teamConference(ctx, 'reviewPapers') } },
		columns: { id: true }
	});
	if (!paper) throw apiError('NOT_FOUND', m.reviewOnlyReviewers());
}
