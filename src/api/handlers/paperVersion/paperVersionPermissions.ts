import { abilityBuilder } from '#api/rumble';
import {
	PAPER_ROLES,
	isInOwnDelegation,
	isTeamMemberOf,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { supervisedDelegationOf } from '../paper/paperPermissions';

/**
 * The abilities of paper versions, which follow what the reader may read of the paper. Versions
 * are written by `createPaper` / `updatePaper` and `createPaperReview`, never through an ability.
 */
export function registerPaperVersionAbilities() {
	abilityBuilder.paperVersion.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Authors read every version of their own papers, drafts included.
	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { paper: { authorParticipant: { userId: id } } } } : undefined;
	});

	// The paper team (`reviewPapers`: reviewer, project management, participant care, team
	// coordinator, content lead) reads every version of the conference's papers.
	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const conference = isTeamMemberOf({ ctx, roles: PAPER_ROLES });
		return conference ? { where: { paper: { conference } } } : undefined;
	});

	// Supervisors of the delegation, and its delegates (the second rule), read the submitted
	// versions of its submitted papers, never a draft - what they may read of the paper itself.
	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						status: { ne: 'DRAFT' },
						paper: { ...supervisedDelegationOf(id), status: { ne: 'DRAFT' } }
					}
				}
			: undefined;
	});

	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const delegation = isInOwnDelegation(ctx);
		return delegation
			? { where: { status: { ne: 'DRAFT' }, paper: { ...delegation, status: { ne: 'DRAFT' } } } }
			: undefined;
	});
}
