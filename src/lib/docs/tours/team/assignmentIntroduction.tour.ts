import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The assignment's introduction. The tab bar and the draft status live in the assignment layout. */
export const assignmentIntroductionTour: Tour = {
	id: 'team.assignmentIntroduction',
	steps: [
		{
			title: () => m.tourTeamAssignmentIntroductionIntroTitle(),
			body: () => m.tourTeamAssignmentIntroductionIntroBody()
		},
		{
			anchor: 'team.assignment.tabs',
			title: () => m.tourTeamAssignmentIntroductionTabsTitle(),
			body: () => m.tourTeamAssignmentIntroductionTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignment.draft-status',
			title: () => m.tourTeamAssignmentIntroductionStatusTitle(),
			body: () => m.tourTeamAssignmentIntroductionStatusBody(),
			side: 'left'
		}
	]
};
