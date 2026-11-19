import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * One survey: its results and settings. Anchors live in `team/survey/[surveyId]/`; the results
 * steps show on the results tab, which the page opens with.
 */
export const surveyDetailTour: Tour = {
	id: 'team.surveyDetail',
	steps: [
		{
			title: () => m.tourTeamSurveyDetailIntroTitle(),
			body: () => m.tourTeamSurveyDetailIntroBody()
		},
		{
			anchor: 'team.surveyDetail.status',
			title: () => m.tourTeamSurveyDetailStatusTitle(),
			body: () => m.tourTeamSurveyDetailStatusBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.surveyDetail.tabs',
			title: () => m.tourTeamSurveyDetailTabsTitle(),
			body: () => m.tourTeamSurveyDetailTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.surveyDetail.charts',
			title: () => m.tourTeamSurveyDetailChartsTitle(),
			body: () => m.tourTeamSurveyDetailChartsBody(),
			side: 'top'
		},
		{
			anchor: 'team.surveyDetail.answers',
			title: () => m.tourTeamSurveyDetailAnswersTitle(),
			body: () => m.tourTeamSurveyDetailAnswersBody(),
			side: 'top'
		},
		{
			anchor: 'team.surveyDetail.distribute',
			title: () => m.tourTeamSurveyDetailDistributeTitle(),
			body: () => m.tourTeamSurveyDetailDistributeBody(),
			side: 'left'
		},
		{
			anchor: 'team.surveyDetail.export',
			title: () => m.tourTeamSurveyDetailExportTitle(),
			body: () => m.tourTeamSurveyDetailExportBody(),
			side: 'top'
		}
	]
};
