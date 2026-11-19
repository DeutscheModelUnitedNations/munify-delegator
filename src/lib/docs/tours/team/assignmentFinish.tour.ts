import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The finish: what the draft does, applying it and the release. */
export const assignmentFinishTour: Tour = {
	id: 'team.assignmentFinish',
	steps: [
		{
			title: () => m.tourTeamAssignmentFinishIntroTitle(),
			body: () => m.tourTeamAssignmentFinishIntroBody()
		},
		{
			anchor: 'team.assignment.tabs',
			title: () => m.tourTeamAssignmentFinishTabsTitle(),
			body: () => m.tourTeamAssignmentFinishTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentFinish.changes',
			title: () => m.tourTeamAssignmentFinishChangesTitle(),
			body: () => m.tourTeamAssignmentFinishChangesBody(),
			side: 'top'
		},
		{
			anchor: 'team.assignmentFinish.actions',
			title: () => m.tourTeamAssignmentFinishActionsTitle(),
			body: () => m.tourTeamAssignmentFinishActionsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentFinish.release',
			title: () => m.tourTeamAssignmentFinishReleaseTitle(),
			body: () => m.tourTeamAssignmentFinishReleaseBody(),
			side: 'top'
		}
	]
};
