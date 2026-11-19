import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The paper hub's start page in the participant view (My Papers).
 */
export const paperhubMyPapersTour: Tour = {
	id: 'paperhub.paperhubMyPapers',
	steps: [
		{
			title: () => m.tourPaperhubMyPapersIntroTitle(),
			body: () => m.tourPaperhubMyPapersIntroBody()
		},
		{
			anchor: 'paperhub.tabs',
			title: () => m.tourPaperhubMyPapersTabsTitle(),
			body: () => m.tourPaperhubMyPapersTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.my-papers',
			title: () => m.tourPaperhubMyPapersListTitle(),
			body: () => m.tourPaperhubMyPapersListBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.my-papers',
			title: () => m.tourPaperhubMyPapersStatusTitle(),
			body: () => m.tourPaperhubMyPapersStatusBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.create',
			title: () => m.tourPaperhubMyPapersCreateTitle(),
			body: () => m.tourPaperhubMyPapersCreateBody(),
			side: 'top'
		},
		{
			title: () => m.tourPaperhubMyPapersVisibilityTitle(),
			body: () => m.tourPaperhubMyPapersVisibilityBody()
		}
	]
};
