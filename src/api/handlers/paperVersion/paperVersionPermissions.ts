import { abilityBuilder } from '#api/rumble';
import { PAPER_ROLES, isInOwnDelegation, systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';

export function registerPaperVersionAbilities() {
	// Ported from abilities/entities/paper/paperVersion.ts
	abilityBuilder.paperVersion.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.paperVersion.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { paper: { authorParticipant: { userId: id } } } } : undefined;
	});

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

	// Supervisors and co-delegates read what they may read of the paper itself: the submitted text,
	// never a draft. Without these the public paper view and the supervisor view load a paper with
	// no versions, i.e. without its content.
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
