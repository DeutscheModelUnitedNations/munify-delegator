import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The statistics page. The widgets carry the anchors (`team.stats.*`). */
export const statsTour: Tour = {
	id: 'team.stats',
	steps: [
		{
			title: () => m.tourTeamStatsIntroTitle(),
			body: () => m.tourTeamStatsIntroBody()
		},
		{
			anchor: 'team.stats.filter',
			title: () => m.tourTeamStatsFilterTitle(),
			body: () => m.tourTeamStatsFilterBody(),
			side: 'right'
		},
		{
			anchor: 'team.stats.totals',
			title: () => m.tourTeamStatsTotalsTitle(),
			body: () => m.tourTeamStatsTotalsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.stats.history',
			title: () => m.tourTeamStatsHistoryTitle(),
			body: () => m.tourTeamStatsHistoryBody(),
			side: 'top'
		}
	]
};
