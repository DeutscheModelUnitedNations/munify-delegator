import type { CalendarEntryColor$options, PaperStatus$options, PaperType$options } from '$houdini';
import { m } from '$lib/paraglide/messages';
import type { RegionalGroup } from '$lib/services/seatPlanning/unMembers';
import type { RegionalBaseline } from '$lib/services/seatPlanning/baselines';

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

export function translateGender(gender: string) {
	switch (gender) {
		case 'MALE':
			return m.male();
		case 'FEMALE':
			return m.female();
		case 'DIVERSE':
			return m.diverse();
		case 'NO_STATEMENT':
			return m.noStatement();
		default:
			return gender;
	}
}

export function translateAdministrativeStatus(status: string) {
	switch (status) {
		case 'DONE':
			return m.statusDone();
		case 'PENDING':
			return m.statusPending();
		case 'PROBLEM':
			return m.statusProblem();
		default:
			return status;
	}
}

export function translateParticipationRole(role: string) {
	switch (role) {
		case 'DELEGATION_MEMBER':
			return m.delegationMember();
		case 'SINGLE_PARTICIPANT':
			return m.singleParticipant();
		case 'SUPERVISOR':
			return m.supervisor();
		case 'TEAM_MEMBER':
			return m.teamMember();
		default:
			return role;
	}
}

export function translateFoodPreference(preference: string) {
	switch (preference) {
		case 'OMNIVORE':
			return m.omnivore();
		case 'VEGETARIAN':
			return m.vegetarian();
		case 'VEGAN':
			return m.vegan();
		default:
			return preference;
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
		case 'CONTENT_LEAD':
			return m.teamRoleContentLead();
		case 'SYSTEM_ADMIN':
			return m.administrator();
		default:
			return role;
	}
}

const regionalGroupLabels: Record<RegionalGroup, () => string> = {
	'African Group': m.regionalGroupAfrican,
	'Asia and the Pacific Group': m.regionalGroupAsiaPacific,
	'Eastern European Group': m.regionalGroupEasternEuropean,
	'Latin American and Caribbean Group': m.regionalGroupLatinAmerican,
	'Western European and Others Group': m.regionalGroupWesternEuropean
};

const regionalGroupShortLabels: Record<RegionalGroup, () => string> = {
	'African Group': m.regionalGroupAfricanShort,
	'Asia and the Pacific Group': m.regionalGroupAsiaPacificShort,
	'Eastern European Group': m.regionalGroupEasternEuropeanShort,
	'Latin American and Caribbean Group': m.regionalGroupLatinAmericanShort,
	'Western European and Others Group': m.regionalGroupWesternEuropeanShort
};

export function translateRegionalGroup(group: RegionalGroup, short = false) {
	return (short ? regionalGroupShortLabels : regionalGroupLabels)[group]();
}

const regionalBaselineLabels: Record<RegionalBaseline, () => string> = {
	UN_MEMBERS: m.regionalBaselineUnMembers,
	HUMAN_RIGHTS_COUNCIL: m.regionalBaselineHumanRightsCouncil,
	ECOSOC: m.regionalBaselineEcosoc,
	SECURITY_COUNCIL: m.regionalBaselineSecurityCouncil,
	MANUAL: m.regionalBaselineManual
};

export function translateRegionalBaseline(baseline: RegionalBaseline) {
	return regionalBaselineLabels[baseline]();
}
