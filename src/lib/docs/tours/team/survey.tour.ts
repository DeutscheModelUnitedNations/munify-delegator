import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The conference's surveys. Anchors live in `team/survey/+page.svelte` and `SurveyCard.svelte`
 * (the first card's).
 */
export const surveyTour: Tour = {
	id: 'team.survey',
	steps: [
		{
			title: () => m.tourTeamSurveyIntroTitle(),
			body: () => m.tourTeamSurveyIntroBody()
		},
		{
			anchor: 'team.survey.create',
			title: () => m.tourTeamSurveyCreateTitle(),
			body: () => m.tourTeamSurveyCreateBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.survey.card',
			title: () => m.tourTeamSurveyCardTitle(),
			body: () => m.tourTeamSurveyCardBody(),
			side: 'top'
		},
		{
			anchor: 'team.survey.card-actions',
			title: () => m.tourTeamSurveyCardActionsTitle(),
			body: () => m.tourTeamSurveyCardActionsBody(),
			side: 'left'
		},
		{
			anchor: 'team.survey.details',
			title: () => m.tourTeamSurveyDetailsTitle(),
			body: () => m.tourTeamSurveyDetailsBody(),
			side: 'top'
		}
	]
};
