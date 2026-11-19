import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The files the team needs outside DELEGATOR. */
export const downloadsTour: Tour = {
	id: 'team.downloads',
	steps: [
		{
			title: () => m.tourTeamDownloadsIntroTitle(),
			body: () => m.tourTeamDownloadsIntroBody()
		},
		{
			anchor: 'team.downloads.csv-settings',
			title: () => m.tourTeamDownloadsCsvSettingsTitle(),
			body: () => m.tourTeamDownloadsCsvSettingsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.downloads.badges',
			title: () => m.tourTeamDownloadsBadgesTitle(),
			body: () => m.tourTeamDownloadsBadgesBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.downloads.registration-lists',
			title: () => m.tourTeamDownloadsRegistrationListsTitle(),
			body: () => m.tourTeamDownloadsRegistrationListsBody(),
			side: 'top'
		},
		{
			anchor: 'team.downloads.integrations',
			title: () => m.tourTeamDownloadsIntegrationsTitle(),
			body: () => m.tourTeamDownloadsIntegrationsBody(),
			side: 'top'
		}
	]
};
