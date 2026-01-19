import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForPaperReview = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Authors can read reviews on their papers
		can(['read', 'list'], 'PaperReview', {
			paperVersion: { paper: { author: { id: user.sub } } }
		});

		// Team members can read all reviews
		can(['read', 'list'], 'PaperReview', {
			paperVersion: {
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
			}
		});

		// Note: Create permission checked in resolver (needs context)
	}
};
