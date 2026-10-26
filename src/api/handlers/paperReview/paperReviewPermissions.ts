import type { Context } from '#api/context.js';
import { db } from '#api/db/db.js';
import { abilityBuilder } from '#api/rumble.js';
import { PAPER_ROLES, hasTeamRole, systemAdmin, userId } from '#api/services/authHelper.js';
import { m } from '#lib/paraglide/messages.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { apiError } from '#api/services/errors/apiError.js';

export function registerPaperReviewAbilities() {
	// Ported from abilities/entities/paper/paperReview.ts
	abilityBuilder.paperReview.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? { where: { paperVersion: { paper: { authorParticipant: { userId: id } } } } }
			: undefined;
	});

	abilityBuilder.paperReview.allow('read').when((ctx) => {
		const id = userId(ctx);
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

/** Rejects the review unless the paper exists and the caller is one of its conference's reviewers. */
export async function assertCanReviewPaper(ctx: Context, paperId: string) {
	const paper = await db.query.paper
		.findFirst({
			where: { id: paperId },
			columns: {},
			with: { delegation: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);

	// Reviewing is a reviewer's action; reading the paper is not enough.
	if (!(await hasTeamRole(ctx, paper.delegation.conferenceId, PAPER_ROLES))) {
		throw apiError('FORBIDDEN', m.reviewOnlyReviewers());
	}
}
