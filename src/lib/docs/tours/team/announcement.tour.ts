import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The announcements a conference's team writes. Anchors live in `team/announcement/+page.svelte`.
 */
export const announcementTour: Tour = {
	id: 'team.announcement',
	steps: [
		{
			title: () => m.tourTeamAnnouncementIntroTitle(),
			body: () => m.tourTeamAnnouncementIntroBody()
		},
		{
			anchor: 'team.announcement.new',
			title: () => m.tourTeamAnnouncementNewTitle(),
			body: () => m.tourTeamAnnouncementNewBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.announcement.list',
			title: () => m.tourTeamAnnouncementListTitle(),
			body: () => m.tourTeamAnnouncementListBody(),
			side: 'top'
		},
		{
			anchor: 'team.announcement.row-actions',
			title: () => m.tourTeamAnnouncementRowActionsTitle(),
			body: () => m.tourTeamAnnouncementRowActionsBody(),
			side: 'left'
		}
	]
};
