import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The schools table. Anchors live in the DataGrid (`grid.*`). */
export const schoolsTour: Tour = {
	id: 'team.schools',
	steps: [
		{
			title: () => m.tourTeamSchoolsIntroTitle(),
			body: () => m.tourTeamSchoolsIntroBody()
		},
		{
			anchor: 'grid.toolbar',
			title: () => m.tourTeamSchoolsToolbarTitle(),
			body: () => m.tourTeamSchoolsToolbarBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.views',
			title: () => m.tourTeamSchoolsViewsTitle(),
			body: () => m.tourTeamSchoolsViewsBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.table',
			title: () => m.tourTeamSchoolsTableTitle(),
			body: () => m.tourTeamSchoolsTableBody(),
			side: 'top'
		}
	]
};
