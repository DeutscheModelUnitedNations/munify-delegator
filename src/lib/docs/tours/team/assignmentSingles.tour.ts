import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The board of the single roles. */
export const assignmentSinglesTour: Tour = {
	id: 'team.assignmentSingles',
	steps: [
		{
			title: () => m.tourTeamAssignmentSinglesIntroTitle(),
			body: () => m.tourTeamAssignmentSinglesIntroBody()
		},
		{
			anchor: 'team.assignment.tabs',
			title: () => m.tourTeamAssignmentSinglesTabsTitle(),
			body: () => m.tourTeamAssignmentSinglesTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentSingles.auto-assign',
			title: () => m.tourTeamAssignmentSinglesAutoAssignTitle(),
			body: () => m.tourTeamAssignmentSinglesAutoAssignBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignment.pool',
			title: () => m.tourTeamAssignmentSinglesPoolTitle(),
			body: () => m.tourTeamAssignmentSinglesPoolBody(),
			side: 'right'
		},
		{
			anchor: 'team.assignmentSingles.convert',
			title: () => m.tourTeamAssignmentSinglesConvertTitle(),
			body: () => m.tourTeamAssignmentSinglesConvertBody(),
			side: 'right'
		},
		{
			anchor: 'team.assignmentSingles.roles',
			title: () => m.tourTeamAssignmentSinglesRolesTitle(),
			body: () => m.tourTeamAssignmentSinglesRolesBody(),
			side: 'left'
		}
	]
};
