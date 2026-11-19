import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The waiting list table. Anchors live in the DataGrid (`grid.*`) and the row actions. */
export const waitingListTour: Tour = {
	id: 'team.waitingList',
	steps: [
		{
			title: () => m.tourTeamWaitingListIntroTitle(),
			body: () => m.tourTeamWaitingListIntroBody()
		},
		{
			anchor: 'grid.toolbar',
			title: () => m.tourTeamWaitingListToolbarTitle(),
			body: () => m.tourTeamWaitingListToolbarBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.views',
			title: () => m.tourTeamWaitingListViewsTitle(),
			body: () => m.tourTeamWaitingListViewsBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.table',
			title: () => m.tourTeamWaitingListTableTitle(),
			body: () => m.tourTeamWaitingListTableBody(),
			side: 'top'
		},
		{
			anchor: 'team.waitingList.actions',
			title: () => m.tourTeamWaitingListActionsTitle(),
			body: () => m.tourTeamWaitingListActionsBody(),
			side: 'left'
		}
	]
};
