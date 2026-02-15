import type { CalendarEntryColor$options, PaperStatus$options, PaperType$options } from '$houdini';
import { m } from '$lib/paraglide/messages';

export function translatePaperStatus(paperStatus: PaperStatus$options) {
	switch (paperStatus) {
		case 'DRAFT':
			return m.paperStatusDraft();
		case 'SUBMITTED':
			return m.paperStatusSubmitted();
		case 'REVISED':
			return m.paperStatusRevised();
		case 'CHANGES_REQUESTED':
			return m.paperStatusChangesRequested();
		case 'ACCEPTED':
			return m.paperStatusAccepted();
	}
}

export function translatePaperType(paperType: PaperType$options) {
	switch (paperType) {
		case 'POSITION_PAPER':
			return m.paperTypePositionPaper();
		case 'INTRODUCTION_PAPER':
			return m.paperTypeIntroductionPaper();
		case 'WORKING_PAPER':
			return m.paperTypeWorkingPaper();
	}
}

export function translateCalendarEntryColor(color: CalendarEntryColor$options) {
	switch (color) {
		case 'SESSION':
			return m.calendarSession();
		case 'WORKSHOP':
			return m.calendarWorkshop();
		case 'LOGISTICS':
			return m.calendarLogistics();
		case 'SOCIAL':
			return m.calendarSocial();
		case 'CEREMONY':
			return m.calendarCeremony();
		case 'BREAK':
			return m.calendarBreak();
		case 'HIGHLIGHT':
			return m.calendarHighlight();
		case 'INFO':
			return m.calendarInfo();
	}
}

export function translateTeamRole(role: string) {
	switch (role) {
		case 'PROJECT_MANAGEMENT':
			return m.teamRoleProjectManagement();
		case 'PARTICIPANT_CARE':
			return m.teamRoleParticipantCare();
		case 'REVIEWER':
			return m.teamRoleReviewer();
		case 'MEMBER':
			return m.teamRoleMember();
		case 'TEAM_COORDINATOR':
			return m.teamRoleTeamCoordinator();
		default:
			return role;
	}
}
