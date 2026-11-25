import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** Who sees what in the guide. Anchors live in `team/guide/visibility/`. */
export const guideVisibilityTour: Tour = {
	id: 'team.guideVisibility',
	steps: [
		{
			anchor: 'team.guideVisibility.readers',
			title: () => m.tourTeamGuideVisibilityReadersTitle(),
			body: () => m.tourTeamGuideVisibilityReadersBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guideVisibility.sidebar',
			title: () => m.tourTeamGuideVisibilitySidebarTitle(),
			body: () => m.tourTeamGuideVisibilitySidebarBody(),
			side: 'right'
		},
		{
			anchor: 'team.guideVisibility.table',
			title: () => m.tourTeamGuideVisibilityTableTitle(),
			body: () => m.tourTeamGuideVisibilityTableBody(),
			side: 'left'
		}
	]
};
