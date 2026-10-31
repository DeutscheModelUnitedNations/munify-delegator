import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import { PAPER_ROLES, systemAdmin, teamConference } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerPaperReviewAbilities() {
	abilityBuilder.paperReview.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Authors read the reviews of their own papers.
	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { paperVersion: { paper: { authorParticipant: { userId: id } } } } }
			: undefined;
	});

	// The paper team (every team role but the plain member) reads the reviews of the conference's
	// papers. Reviews are written through `createPaperReview`, never updated.
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
 * Refuses (NOT_FOUND) unless the paper exists in a conference where the caller is on the paper
 * team (`reviewPapers`). Reading the paper is not enough to review it.
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
}
