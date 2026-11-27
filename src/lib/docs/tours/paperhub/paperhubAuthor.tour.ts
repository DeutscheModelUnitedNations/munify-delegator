import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * A paper as its author or a supervisor (read-only). Steps whose anchor is absent are
 * skipped: supervisors see no action bar and no danger zone, authors no supervisor notice.
 */
export const paperhubAuthorTour: Tour = {
	id: 'paperhub.paperhubAuthor',
	steps: [
		{
			title: () => m.tourPaperhubAuthorIntroTitle(),
			body: () => m.tourPaperhubAuthorIntroBody()
		},
		{
			anchor: 'paperhub.paper.header',
			title: () => m.tourPaperhubAuthorHeaderTitle(),
			body: () => m.tourPaperhubAuthorHeaderBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.supervisor-notice',
			title: () => m.tourPaperhubAuthorSupervisorNoticeTitle(),
			body: () => m.tourPaperhubAuthorSupervisorNoticeBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.discussion-points',
			title: () => m.tourPaperhubDiscussionPointsTitle(),
			body: () => m.tourPaperhubAuthorDiscussionPointsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.content',
			title: () => m.tourPaperhubAuthorContentTitle(),
			body: () => m.tourPaperhubAuthorContentBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.paper.actions',
			title: () => m.tourPaperhubAuthorActionsTitle(),
			body: () => m.tourPaperhubAuthorActionsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.export',
			title: () => m.tourPaperhubAuthorExportTitle(),
			body: () => m.tourPaperhubAuthorExportBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.history',
			title: () => m.tourPaperhubAuthorHistoryTitle(),
			body: () => m.tourPaperhubAuthorHistoryBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.paper.danger-zone',
			title: () => m.tourPaperhubAuthorDangerZoneTitle(),
			body: () => m.tourPaperhubAuthorDangerZoneBody(),
			side: 'top'
		}
	]
};
