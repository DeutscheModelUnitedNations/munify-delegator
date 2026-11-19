import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * Another delegation's paper, read-only, from the conference papers.
 */
export const paperhubViewTour: Tour = {
	id: 'paperhub.paperhubView',
	steps: [
		{
			title: () => m.tourPaperhubViewIntroTitle(),
			body: () => m.tourPaperhubViewIntroBody()
		},
		{
			anchor: 'paperhub.paper.header',
			title: () => m.tourPaperhubViewHeaderTitle(),
			body: () => m.tourPaperhubViewHeaderBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.read.notice',
			title: () => m.tourPaperhubViewNoticeTitle(),
			body: () => m.tourPaperhubViewNoticeBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.read.content',
			title: () => m.tourPaperhubViewContentTitle(),
			body: () => m.tourPaperhubViewContentBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.read.back',
			title: () => m.tourPaperhubViewBackTitle(),
			body: () => m.tourPaperhubViewBackBody(),
			side: 'bottom'
		}
	]
};
