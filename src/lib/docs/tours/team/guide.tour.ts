import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The guide workspace's structure tab. Anchors live in `team/guide/+layout.svelte`, the tree
 * (`team/guide/tree/`) and `team/guide/+page.svelte`.
 */
export const guideTour: Tour = {
	id: 'team.guide',
	steps: [
		{ title: () => m.tourTeamGuideIntroTitle(), body: () => m.tourTeamGuideIntroBody() },
		{
			anchor: 'team.guide.tabs',
			title: () => m.tourTeamGuideTabsTitle(),
			body: () => m.tourTeamGuideTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guide.tree',
			title: () => m.tourTeamGuideTreeTitle(),
			body: () => m.tourTeamGuideTreeBody(),
			side: 'right'
		},
		{
			anchor: 'team.guide.new',
			title: () => m.tourTeamGuideNewTitle(),
			body: () => m.tourTeamGuideNewBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guide.publish',
			title: () => m.tourTeamGuidePublishTitle(),
			body: () => m.tourTeamGuidePublishBody(),
			side: 'right'
		},
		{
			anchor: 'team.guide.settings',
			title: () => m.tourTeamGuideSettingsTitle(),
			body: () => m.tourTeamGuideSettingsBody(),
			side: 'bottom'
		}
	]
};
