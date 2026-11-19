import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The scanner with its sessions. Which steps show depends on whether a session runs on this device. */
export const attendanceTour: Tour = {
	id: 'team.attendance',
	steps: [
		{
			title: () => m.tourTeamAttendanceIntroTitle(),
			body: () => m.tourTeamAttendanceIntroBody()
		},
		{
			anchor: 'team.attendance.sessions',
			title: () => m.tourTeamAttendanceSessionsTitle(),
			body: () => m.tourTeamAttendanceSessionsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.attendance.new-session',
			title: () => m.tourTeamAttendanceNewSessionTitle(),
			body: () => m.tourTeamAttendanceNewSessionBody(),
			side: 'left'
		},
		{
			anchor: 'team.attendance.session-bar',
			title: () => m.tourTeamAttendanceSessionBarTitle(),
			body: () => m.tourTeamAttendanceSessionBarBody(),
			side: 'bottom'
		},
		{
			anchor: 'scanner.camera',
			title: () => m.tourTeamAttendanceCameraTitle(),
			body: () => m.tourTeamAttendanceCameraBody(),
			side: 'right'
		},
		{
			anchor: 'team.attendance.recent',
			title: () => m.tourTeamAttendanceRecentTitle(),
			body: () => m.tourTeamAttendanceRecentBody(),
			side: 'top'
		},
		{
			anchor: 'team.attendance.people',
			title: () => m.tourTeamAttendancePeopleTitle(),
			body: () => m.tourTeamAttendancePeopleBody(),
			side: 'top'
		}
	]
};
