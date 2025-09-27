import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForWaitingListEntry = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// The user should be able to read and list their own WaitingListEntry
		can(['read', 'list'], 'WaitingListEntry', {
			user: {
				id: user.sub
			}
		});

		// team members should be able to edit the WaitingListEntry of their conferences
		can(['read', 'list', 'update', 'delete'], 'WaitingListEntry', {
			question: {
				conference: {
					teamMembers: {
						some: {
							user: {
								id: user.sub
							},
							role: { in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'] }
						}
					}
				}
			}
		});
	}
};
