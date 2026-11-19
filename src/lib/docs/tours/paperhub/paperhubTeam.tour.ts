import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The paper hub's start page in the team view (`PaperHubOverview.svelte`). The help button and
 * agenda item table anchors are set only inside the open committee and agenda item, so their steps
 * are skipped while everything is collapsed.
 */
export const paperhubTeamTour: Tour = {
	id: 'paperhub.paperhubTeam',
	steps: [
		{
			title: () => m.tourPaperhubTeamIntroTitle(),
			body: () => m.tourPaperhubTeamIntroBody()
		},
		{
			anchor: 'paperhub.tabs',
			title: () => m.tourPaperhubTeamTabsTitle(),
			body: () => m.tourPaperhubTeamTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.team.status',
			title: () => m.tourPaperhubTeamStatusTitle(),
			body: () => m.tourPaperhubTeamStatusBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.team.my-stats',
			title: () => m.tourPaperhubTeamMyStatsTitle(),
			body: () => m.tourPaperhubTeamMyStatsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.team.controls',
			title: () => m.tourPaperhubTeamControlsTitle(),
			body: () => m.tourPaperhubTeamControlsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.team.sections',
			title: () => m.tourPaperhubTeamSectionsTitle(),
			body: () => m.tourPaperhubTeamSectionsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.team.papers',
			title: () => m.tourPaperhubTeamPapersTitle(),
			body: () => m.tourPaperhubTeamPapersBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.team.help-status',
			title: () => m.tourPaperhubTeamHelpStatusTitle(),
			body: () => m.tourPaperhubTeamHelpStatusBody(),
			side: 'right'
		},
		{
			anchor: 'paperhub.team.table',
			title: () => m.tourPaperhubTeamTableTitle(),
			body: () => m.tourPaperhubTeamTableBody(),
			side: 'top'
		}
	]
};
