import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The seat planning: the states matrix, the role tables and the hints. */
export const seatPlanningTour: Tour = {
	id: 'team.seatPlanning',
	steps: [
		{
			title: () => m.tourTeamSeatPlanningIntroTitle(),
			body: () => m.tourTeamSeatPlanningIntroBody()
		},
		{
			anchor: 'team.seatPlanning.tabs',
			title: () => m.tourTeamSeatPlanningTabsTitle(),
			body: () => m.tourTeamSeatPlanningTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.seatPlanning.filters',
			title: () => m.tourTeamSeatPlanningFiltersTitle(),
			body: () => m.tourTeamSeatPlanningFiltersBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.seatPlanning.matrix',
			title: () => m.tourTeamSeatPlanningMatrixTitle(),
			body: () => m.tourTeamSeatPlanningMatrixBody(),
			side: 'top'
		},
		{
			anchor: 'team.seatPlanning.hints',
			title: () => m.tourTeamSeatPlanningHintsTitle(),
			body: () => m.tourTeamSeatPlanningHintsBody(),
			side: 'left'
		}
	]
};
