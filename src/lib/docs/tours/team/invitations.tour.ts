import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The pending invitations of team management. */
export const invitationsTour: Tour = {
	id: 'team.invitations',
	steps: [
		{
			title: () => m.tourTeamInvitationsIntroTitle(),
			body: () => m.tourTeamInvitationsIntroBody()
		},
		{
			anchor: 'team.members.invite',
			title: () => m.tourTeamInvitationsInviteTitle(),
			body: () => m.tourTeamInvitationsInviteBody(),
			side: 'left'
		},
		{
			anchor: 'team.invitations.table',
			title: () => m.tourTeamInvitationsTableTitle(),
			body: () => m.tourTeamInvitationsTableBody(),
			side: 'top'
		}
	]
};
