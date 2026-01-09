import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForPaperVersion = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Authors can read their own paper versions
		can(['read', 'list'], 'PaperVersion', {
			paper: { author: { id: user.sub } }
		});

		// Team members can read all versions
		can(['read', 'list'], 'PaperVersion', {
			paper: {
				conference: {
					teamMembers: {
						some: {
							user: { id: user.sub },
							role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
						}
					}
				}
			}
		});
	}
};
