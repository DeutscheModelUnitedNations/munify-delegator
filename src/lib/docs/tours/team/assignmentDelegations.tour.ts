import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The board of the nations and non-state actors, one group size at a time. */
export const assignmentDelegationsTour: Tour = {
	id: 'team.assignmentDelegations',
	steps: [
		{
			title: () => m.tourTeamAssignmentDelegationsIntroTitle(),
			body: () => m.tourTeamAssignmentDelegationsIntroBody()
		},
		{
			anchor: 'team.assignment.tabs',
			title: () => m.tourTeamAssignmentDelegationsTabsTitle(),
			body: () => m.tourTeamAssignmentDelegationsTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignmentDelegations.sizes',
			title: () => m.tourTeamAssignmentDelegationsSizesTitle(),
			body: () => m.tourTeamAssignmentDelegationsSizesBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.assignment.pool',
			title: () => m.tourTeamAssignmentDelegationsPoolTitle(),
			body: () => m.tourTeamAssignmentDelegationsPoolBody(),
			side: 'right'
		},
		{
			anchor: 'team.assignmentDelegations.roles',
			title: () => m.tourTeamAssignmentDelegationsRolesTitle(),
			body: () => m.tourTeamAssignmentDelegationsRolesBody(),
			side: 'left'
		},
		{
			anchor: 'team.assignmentDelegations.actions',
			title: () => m.tourTeamAssignmentDelegationsActionsTitle(),
			body: () => m.tourTeamAssignmentDelegationsActionsBody(),
			side: 'bottom'
		}
	]
};
