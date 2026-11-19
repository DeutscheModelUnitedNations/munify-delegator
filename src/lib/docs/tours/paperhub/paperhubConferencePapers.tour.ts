import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The paper hub's start page in the conference papers view.
 */
export const paperhubConferencePapersTour: Tour = {
	id: 'paperhub.paperhubConferencePapers',
	steps: [
		{
			title: () => m.tourPaperhubConferencePapersIntroTitle(),
			body: () => m.tourPaperhubConferencePapersIntroBody()
		},
		{
			anchor: 'paperhub.tabs',
			title: () => m.tourPaperhubConferencePapersTabsTitle(),
			body: () => m.tourPaperhubConferencePapersTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.conference.search',
			title: () => m.tourPaperhubConferencePapersSearchTitle(),
			body: () => m.tourPaperhubConferencePapersSearchBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.conference.committees',
			title: () => m.tourPaperhubConferencePapersCommitteesTitle(),
			body: () => m.tourPaperhubConferencePapersCommitteesBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.conference.introduction',
			title: () => m.tourPaperhubConferencePapersIntroductionTitle(),
			body: () => m.tourPaperhubConferencePapersIntroductionBody(),
			side: 'top'
		}
	]
};
