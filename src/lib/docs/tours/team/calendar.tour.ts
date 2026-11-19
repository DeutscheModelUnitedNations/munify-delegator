import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The schedule editor. Anchors live in `team/calendar/`; the editor's steps are skipped while the
 * conference has no day yet, the empty state's while it has.
 */
export const calendarTour: Tour = {
	id: 'team.calendar',
	steps: [
		{
			title: () => m.tourTeamCalendarIntroTitle(),
			body: () => m.tourTeamCalendarIntroBody()
		},
		{
			anchor: 'team.calendar.tabs',
			title: () => m.tourTeamCalendarTabsTitle(),
			body: () => m.tourTeamCalendarTabsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.calendar.no-days',
			title: () => m.tourTeamCalendarNoDaysTitle(),
			body: () => m.tourTeamCalendarNoDaysBody(),
			side: 'top'
		},
		{
			anchor: 'team.calendar.toolbar',
			title: () => m.tourTeamCalendarToolbarTitle(),
			body: () => m.tourTeamCalendarToolbarBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.calendar.grid',
			title: () => m.tourTeamCalendarGridTitle(),
			body: () => m.tourTeamCalendarGridBody(),
			side: 'top'
		}
	]
};
