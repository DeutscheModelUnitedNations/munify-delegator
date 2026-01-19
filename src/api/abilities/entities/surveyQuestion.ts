import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForSurveyQuestion = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Everyone should be able to read the survey questions
		can(['read', 'list'], 'SurveyQuestion');

		// team members should be able to edit the SurveyQuestions of their conferences
		// Note: 'create' is handled directly in the mutation resolver
		can(['read', 'list', 'update', 'delete'], 'SurveyQuestion', {
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
