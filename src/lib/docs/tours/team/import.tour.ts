import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** Importing the attendance from CHASE. */
export const importTour: Tour = {
	id: 'team.import',
	steps: [
		{
			title: () => m.tourTeamImportIntroTitle(),
			body: () => m.tourTeamImportIntroBody()
		},
		{
			anchor: 'team.import.source',
			title: () => m.tourTeamImportSourceTitle(),
			body: () => m.tourTeamImportSourceBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.import.delegates',
			title: () => m.tourTeamImportDelegatesTitle(),
			body: () => m.tourTeamImportDelegatesBody(),
			side: 'top'
		},
		{
			anchor: 'team.import.nsas',
			title: () => m.tourTeamImportNsasTitle(),
			body: () => m.tourTeamImportNsasBody(),
			side: 'top'
		},
		{
			anchor: 'team.import.save',
			title: () => m.tourTeamImportSaveTitle(),
			body: () => m.tourTeamImportSaveBody(),
			side: 'top'
		}
	]
};
