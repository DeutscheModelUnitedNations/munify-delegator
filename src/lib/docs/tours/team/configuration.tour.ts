import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The conference settings (`ConferenceSettingsEditor`). */
export const configurationTour: Tour = {
	id: 'team.configuration',
	steps: [
		{
			title: () => m.tourTeamConfigurationIntroTitle(),
			body: () => m.tourTeamConfigurationIntroBody()
		},
		{
			anchor: 'team.configuration.tabs',
			title: () => m.tourTeamConfigurationTabsTitle(),
			body: () => m.tourTeamConfigurationTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.configuration.read-only',
			title: () => m.tourTeamConfigurationReadOnlyTitle(),
			body: () => m.tourTeamConfigurationReadOnlyBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.configuration.save',
			title: () => m.tourTeamConfigurationSaveTitle(),
			body: () => m.tourTeamConfigurationSaveBody(),
			side: 'bottom'
		},
		{
			title: () => m.tourTeamConfigurationInstantTitle(),
			body: () => m.tourTeamConfigurationInstantBody()
		}
	]
};
