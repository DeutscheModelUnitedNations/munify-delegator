import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The on-site check-in: the number of nametag tables, the downloads and the split. */
export const checkInTour: Tour = {
	id: 'team.checkIn',
	steps: [
		{
			title: () => m.tourTeamCheckInIntroTitle(),
			body: () => m.tourTeamCheckInIntroBody()
		},
		{
			anchor: 'team.checkIn.bin-count',
			title: () => m.tourTeamCheckInBinCountTitle(),
			body: () => m.tourTeamCheckInBinCountBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.checkIn.downloads',
			title: () => m.tourTeamCheckInDownloadsTitle(),
			body: () => m.tourTeamCheckInDownloadsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.checkIn.tables',
			title: () => m.tourTeamCheckInTablesTitle(),
			body: () => m.tourTeamCheckInTablesBody(),
			side: 'top'
		}
	]
};
