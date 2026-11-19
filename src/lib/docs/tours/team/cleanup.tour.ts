import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** Normalizing school names. The table anchor lives in the DataGrid (`grid.table`). */
export const cleanupTour: Tour = {
	id: 'team.cleanup',
	steps: [
		{
			title: () => m.tourTeamCleanupIntroTitle(),
			body: () => m.tourTeamCleanupIntroBody()
		},
		{
			anchor: 'team.cleanup.suggestions',
			title: () => m.tourTeamCleanupSuggestionsTitle(),
			body: () => m.tourTeamCleanupSuggestionsBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.table',
			title: () => m.tourTeamCleanupTableTitle(),
			body: () => m.tourTeamCleanupTableBody(),
			side: 'top'
		},
		{
			anchor: 'team.cleanup.merge',
			title: () => m.tourTeamCleanupMergeTitle(),
			body: () => m.tourTeamCleanupMergeBody(),
			side: 'bottom'
		}
	]
};
