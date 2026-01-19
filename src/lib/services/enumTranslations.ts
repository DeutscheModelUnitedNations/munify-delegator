import type { PaperStatus$options, PaperType$options } from '$houdini';
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
		default:
			return role;
	}
}
