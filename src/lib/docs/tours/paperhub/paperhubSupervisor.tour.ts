import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The paper hub's start page in the supervisor view.
 */
export const paperhubSupervisorTour: Tour = {
	id: 'paperhub.paperhubSupervisor',
	steps: [
		{
			title: () => m.tourPaperhubSupervisorIntroTitle(),
			body: () => m.tourPaperhubSupervisorIntroBody()
		},
		{
			anchor: 'paperhub.tabs',
			title: () => m.tourPaperhubSupervisorTabsTitle(),
			body: () => m.tourPaperhubSupervisorTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.supervisor.stats',
			title: () => m.tourPaperhubSupervisorStatsTitle(),
			body: () => m.tourPaperhubSupervisorStatsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.supervisor.papers',
			title: () => m.tourPaperhubSupervisorPapersTitle(),
			body: () => m.tourPaperhubSupervisorPapersBody(),
			side: 'top'
		},
		{
			title: () => m.tourPaperhubSupervisorVisibilityTitle(),
			body: () => m.tourPaperhubSupervisorVisibilityBody()
		}
	]
};
