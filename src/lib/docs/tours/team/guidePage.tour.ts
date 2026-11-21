import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** A guide page in the editor. Anchors live in `team/guide/page/[pageId]/+page.svelte`. */
export const guidePageTour: Tour = {
	id: 'team.guidePage',
	steps: [
		{
			anchor: 'team.guidePage.scope',
			title: () => m.tourTeamGuidePageScopeTitle(),
			body: () => m.tourTeamGuidePageScopeBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guidePage.editor',
			title: () => m.tourTeamGuidePageEditorTitle(),
			body: () => m.tourTeamGuidePageEditorBody(),
			side: 'top'
		},
		{
			anchor: 'team.guidePage.publish',
			title: () => m.tourTeamGuidePagePublishTitle(),
			body: () => m.tourTeamGuidePagePublishBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.guidePage.versions',
			title: () => m.tourTeamGuidePageVersionsTitle(),
			body: () => m.tourTeamGuidePageVersionsBody(),
			side: 'top'
		}
	]
};
