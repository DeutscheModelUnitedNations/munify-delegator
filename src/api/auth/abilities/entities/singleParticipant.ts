import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForSingleParticipant = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// the user should be able to see their own entities
		can('read', 'SingleParticipant', {
			user: { id: user.sub }
		});

		// team members should be able to see the single participants of their conferences
		can(['read', 'list'], 'SingleParticipant', {
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
	}
};
