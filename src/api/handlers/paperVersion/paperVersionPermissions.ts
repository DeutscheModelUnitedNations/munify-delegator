import { abilityBuilder } from '#api/rumble';
import { PAPER_ROLES, isInOwnDelegation, systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';

export function registerPaperVersionAbilities() {
	abilityBuilder.paperVersion.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Authors read every version of their own papers, drafts included.
	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { paper: { authorParticipant: { userId: id } } } } : undefined;
	});

	// The paper team (every team role but the plain member) reads every version of the
	// conference's papers.
	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						paper: {
							conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
						}
					}
				}
			: undefined;
	});

	// Supervisors of the delegation, and its delegates (the second rule), read the submitted
	// versions of its submitted papers, never a draft - what they may read of the paper itself.
	// Without these the delegation's and the supervisor's paper views load a paper without content.
	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						status: { ne: 'DRAFT' },
						paper: {
							status: { ne: 'DRAFT' },
							delegation: { members: { supervisors: { participant: { userId: id } } } }
						}
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
