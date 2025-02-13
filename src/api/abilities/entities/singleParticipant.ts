import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForSingleParticipant = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// the user should be able to see their own entities
		can('read', 'SingleParticipant', {
			user: { id: user.sub }
		});

		// team members should be able to see the single participants of their conferences
		can(['read', 'list', 'update', 'delete'], 'SingleParticipant', {
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
		});

		// the user should be able to update/delete their own entities
		can(['update', 'delete'], 'SingleParticipant', {
			user: { id: user.sub },
			applied: false
		});
	}
};
