import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The weights of the automatic distribution. */
export const assignmentWeightingTour: Tour = {
	id: 'team.assignmentWeighting',
	steps: [
		{
			title: () => m.tourTeamAssignmentWeightingIntroTitle(),
			body: () => m.tourTeamAssignmentWeightingIntroBody()
		},
		{
			anchor: 'team.assignment.tabs',
			title: () => m.tourTeamAssignmentWeightingTabsTitle(),
			body: () => m.tourTeamAssignmentWeightingTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentWeighting.form',
			title: () => m.tourTeamAssignmentWeightingFormTitle(),
			body: () => m.tourTeamAssignmentWeightingFormBody(),
			side: 'right'
		},
		{
			anchor: 'team.assignmentWeighting.examples',
			title: () => m.tourTeamAssignmentWeightingExamplesTitle(),
			body: () => m.tourTeamAssignmentWeightingExamplesBody(),
			side: 'left'
		},
		{
			anchor: 'team.assignmentWeighting.impact',
			title: () => m.tourTeamAssignmentWeightingImpactTitle(),
			body: () => m.tourTeamAssignmentWeightingImpactBody(),
			side: 'left'
		}
	]
};
