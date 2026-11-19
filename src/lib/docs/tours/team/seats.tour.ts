import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The seats page: every role with its seats, and switching seats. */
export const seatsTour: Tour = {
	id: 'team.seats',
	steps: [
		{
			title: () => m.tourTeamSeatsIntroTitle(),
			body: () => m.tourTeamSeatsIntroBody()
		},
		{
			anchor: 'team.seats.switch',
			title: () => m.tourTeamSeatsSwitchTitle(),
			body: () => m.tourTeamSeatsSwitchBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.seats.delegations',
			title: () => m.tourTeamSeatsDelegationsTitle(),
			body: () => m.tourTeamSeatsDelegationsBody(),
			side: 'top'
		},
		{
			anchor: 'team.seats.other-roles',
			title: () => m.tourTeamSeatsOtherRolesTitle(),
			body: () => m.tourTeamSeatsOtherRolesBody(),
			side: 'top'
		},
		{
			title: () => m.tourTeamSeatsReleaseTitle(),
			body: () => m.tourTeamSeatsReleaseBody()
		}
	]
};
