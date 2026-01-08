import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForPaper = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Authors can read, list, update their own papers
		can(['read', 'list', 'update'], 'Paper', {
			author: { id: user.sub }
		});

		// Team members (REVIEWER, PROJECT_MANAGEMENT, PARTICIPANT_CARE) can read/list all conference papers
		can(['read', 'list'], 'Paper', {
			conference: {
				teamMembers: {
					some: {
						user: { id: user.sub },
						role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
					}
				}
			}
		});

		// PROJECT_MANAGEMENT can update any paper (admin override)
		can(['update'], 'Paper', {
			conference: {
				teamMembers: {
					some: {
						user: { id: user.sub },
						role: 'PROJECT_MANAGEMENT'
					}
				}
			}
		});

		// Authors can delete their own draft papers only
		can(['delete'], 'Paper', {
			author: { id: user.sub },
			status: 'DRAFT'
		});
	}
};
