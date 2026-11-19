import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The user card as a page of its own. Its anchors live in the card's components (`#lib/components/userCard/`). */
export const userCardTour: Tour = {
	id: 'team.userCard',
	steps: [
		{
			title: () => m.tourTeamUserCardIntroTitle(),
			body: () => m.tourTeamUserCardIntroBody()
		},
		{
			anchor: 'team.userCard.header',
			title: () => m.tourTeamUserCardHeaderTitle(),
			body: () => m.tourTeamUserCardHeaderBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.userCard.actions',
			title: () => m.tourTeamUserCardActionsTitle(),
			body: () => m.tourTeamUserCardActionsBody(),
			side: 'left'
		},
		{
			anchor: 'team.userCard.status',
			title: () => m.tourTeamUserCardStatusTitle(),
			body: () => m.tourTeamUserCardStatusBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.userCard.tabs',
			title: () => m.tourTeamUserCardTabsTitle(),
			body: () => m.tourTeamUserCardTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.userCard.content',
			title: () => m.tourTeamUserCardContentTitle(),
			body: () => m.tourTeamUserCardContentBody(),
			side: 'top'
		}
	]
};
