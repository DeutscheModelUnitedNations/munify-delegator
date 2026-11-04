import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * A participant's (or supervisor's) dashboard of one conference. Anchors live in
 * `ConferenceHeader.svelte`, `DashboardQuickLinks.svelte` and the dashboard page; steps whose
 * anchor is not on screen (the quick links appear in preparation) are skipped.
 */
export const participantDashboardTour: Tour = {
	id: 'participant.dashboard',
	steps: [
		{
			title: () => m.tourDashboardIntroTitle(),
			body: () => m.tourDashboardIntroBody()
		},
		{
			anchor: 'dashboard.header',
			title: () => m.tourDashboardHeaderTitle(),
			body: () => m.tourDashboardHeaderBody(),
			side: 'bottom'
		},
		{
			anchor: 'dashboard.quick-links',
			title: () => m.tourDashboardQuickLinksTitle(),
			body: () => m.tourDashboardQuickLinksBody(),
			side: 'top'
		},
		{
			anchor: 'dashboard.stages',
			title: () => m.tourDashboardStagesTitle(),
			body: () => m.tourDashboardStagesBody(),
			side: 'top'
		}
	]
};
