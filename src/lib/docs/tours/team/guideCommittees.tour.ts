import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The committee matrix of the guide. Anchors live in `team/guide/committees/+page.svelte`. */
export const guideCommitteesTour: Tour = {
	id: 'team.guideCommittees',
	steps: [
		{
			anchor: 'team.guideCommittees.matrix',
			title: () => m.tourTeamGuideCommitteesTitle(),
			body: () => m.tourTeamGuideCommitteesBody(),
			side: 'top'
		}
	]
};
