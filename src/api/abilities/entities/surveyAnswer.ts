import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForSurveyAnswer = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// The user should be able to read his own survey answers
		can(['read', 'list'], 'SurveyAnswer', {
			user: {
				id: user.sub
			}
		});

		// team members should be able to edit the SurveyQuestions of their conferences
		can(['read', 'list', 'update', 'delete'], 'SurveyAnswer', {
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
