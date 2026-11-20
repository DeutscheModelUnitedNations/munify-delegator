import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The guide's pages and settings. Anchors live in `team/guide/+page.svelte`. */
export const guideTour: Tour = {
	id: 'team.guide',
	steps: [
		{ title: () => m.tourTeamGuideIntroTitle(), body: () => m.tourTeamGuideIntroBody() },
		{
			anchor: 'team.guide.settings',
			title: () => m.tourTeamGuideSettingsTitle(),
			body: () => m.tourTeamGuideSettingsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guide.new',
			title: () => m.tourTeamGuideNewTitle(),
			body: () => m.tourTeamGuideNewBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guide.list',
			title: () => m.tourTeamGuideListTitle(),
			body: () => m.tourTeamGuideListBody(),
			side: 'top'
		},
		{
			anchor: 'team.guide.committees',
			title: () => m.tourTeamGuideCommitteesTitle(),
			body: () => m.tourTeamGuideCommitteesBody(),
			side: 'top'
		}
	]
};
