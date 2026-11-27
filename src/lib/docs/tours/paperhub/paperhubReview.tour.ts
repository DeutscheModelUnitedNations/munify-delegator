import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * A paper seen by a reviewer (`[paperId]/+page.svelte` with `PaperReviewSection.svelte`). The
 * next-paper link appears only after a review, the danger zone only for project management.
 */
export const paperhubReviewTour: Tour = {
	id: 'paperhub.paperhubReview',
	steps: [
		{
			title: () => m.tourPaperhubReviewIntroTitle(),
			body: () => m.tourPaperhubReviewIntroBody()
		},
		{
			anchor: 'paperhub.paper.header',
			title: () => m.tourPaperhubReviewHeaderTitle(),
			body: () => m.tourPaperhubReviewHeaderBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.actions',
			title: () => m.tourPaperhubReviewActionsTitle(),
			body: () => m.tourPaperhubReviewActionsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.discussion-points',
			title: () => m.tourPaperhubDiscussionPointsTitle(),
			body: () => m.tourPaperhubReviewDiscussionPointsBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.paper.content',
			title: () => m.tourPaperhubReviewContentTitle(),
			body: () => m.tourPaperhubReviewContentBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.review.comments',
			title: () => m.tourPaperhubReviewCommentsTitle(),
			body: () => m.tourPaperhubReviewCommentsBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.review.status',
			title: () => m.tourPaperhubReviewStatusTitle(),
			body: () => m.tourPaperhubReviewStatusBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.review.anonymity',
			title: () => m.tourPaperhubReviewAnonymityTitle(),
			body: () => m.tourPaperhubReviewAnonymityBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.review.submit',
			title: () => m.tourPaperhubReviewSubmitTitle(),
			body: () => m.tourPaperhubReviewSubmitBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.review.next',
			title: () => m.tourPaperhubReviewNextTitle(),
			body: () => m.tourPaperhubReviewNextBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.paper.history',
			title: () => m.tourPaperhubReviewHistoryTitle(),
			body: () => m.tourPaperhubReviewHistoryBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.paper.danger-zone',
			title: () => m.tourPaperhubReviewDangerZoneTitle(),
			body: () => m.tourPaperhubReviewDangerZoneBody(),
			side: 'top'
		}
	]
};
