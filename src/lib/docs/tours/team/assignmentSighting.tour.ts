import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The sighting: one application card at a time. */
export const assignmentSightingTour: Tour = {
	id: 'team.assignmentSighting',
	steps: [
		{
			title: () => m.tourTeamAssignmentSightingIntroTitle(),
			body: () => m.tourTeamAssignmentSightingIntroBody()
		},
		{
			anchor: 'team.assignment.tabs',
			title: () => m.tourTeamAssignmentSightingTabsTitle(),
			body: () => m.tourTeamAssignmentSightingTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentSighting.filters',
			title: () => m.tourTeamAssignmentSightingFiltersTitle(),
			body: () => m.tourTeamAssignmentSightingFiltersBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentSighting.review',
			title: () => m.tourTeamAssignmentSightingReviewTitle(),
			body: () => m.tourTeamAssignmentSightingReviewBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentSighting.wishes',
			title: () => m.tourTeamAssignmentSightingWishesTitle(),
			body: () => m.tourTeamAssignmentSightingWishesBody(),
			side: 'top'
		},
		{
			anchor: 'team.assignmentSighting.note',
			title: () => m.tourTeamAssignmentSightingNoteTitle(),
			body: () => m.tourTeamAssignmentSightingNoteBody(),
			side: 'top'
		},
		{
			anchor: 'team.assignmentSighting.deck',
			title: () => m.tourTeamAssignmentSightingDeckTitle(),
			body: () => m.tourTeamAssignmentSightingDeckBody(),
			side: 'top'
		}
	]
};
