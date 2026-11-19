import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The team members table, with the tabs and the invite button of team management. */
export const membersTour: Tour = {
	id: 'team.members',
	steps: [
		{
			title: () => m.tourTeamMembersIntroTitle(),
			body: () => m.tourTeamMembersIntroBody()
		},
		{
			anchor: 'team.members.tabs',
			title: () => m.tourTeamMembersTabsTitle(),
			body: () => m.tourTeamMembersTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.members.invite',
			title: () => m.tourTeamMembersInviteTitle(),
			body: () => m.tourTeamMembersInviteBody(),
			side: 'left'
		},
		{
			anchor: 'grid.table',
			title: () => m.tourTeamMembersTableTitle(),
			body: () => m.tourTeamMembersTableBody(),
			side: 'top'
		},
		{
			anchor: 'team.members.role',
			title: () => m.tourTeamMembersRoleTitle(),
			body: () => m.tourTeamMembersRoleBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.members.actions',
			title: () => m.tourTeamMembersActionsTitle(),
			body: () => m.tourTeamMembersActionsBody(),
			side: 'left'
		}
	]
};
