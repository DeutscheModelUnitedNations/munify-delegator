import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** Letting AI assistants work with the conference, and their log. */
export const aiAccessTour: Tour = {
	id: 'team.aiAccess',
	steps: [
		{
			title: () => m.tourTeamAiAccessIntroTitle(),
			body: () => m.tourTeamAiAccessIntroBody()
		},
		{
			anchor: 'team.aiAccess.privacy',
			title: () => m.tourTeamAiAccessPrivacyTitle(),
			body: () => m.tourTeamAiAccessPrivacyBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.aiAccess.switch',
			title: () => m.tourTeamAiAccessSwitchTitle(),
			body: () => m.tourTeamAiAccessSwitchBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.aiAccess.connect',
			title: () => m.tourTeamAiAccessConnectTitle(),
			body: () => m.tourTeamAiAccessConnectBody(),
			side: 'top'
		},
		{
			anchor: 'team.aiAccess.log',
			title: () => m.tourTeamAiAccessLogTitle(),
			body: () => m.tourTeamAiAccessLogBody(),
			side: 'top'
		}
	]
};
