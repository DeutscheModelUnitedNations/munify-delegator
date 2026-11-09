import { m } from '#lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import { splitRole, type ConferenceRoleKind } from '#lib/helpers/conferenceRole';

export interface HistoryEntry {
	conferenceId: string;
	conferenceTitle: string;
	startDate: Date | null;
	endDate: Date | null;
	roleType: 'delegation' | 'singleParticipant' | 'supervisor' | 'team';
	roleLabel: string;
	icon: string;
	flag?: { type: 'nation'; alpha2Code: string } | { type: 'nsa'; icon: string };
	assignmentName?: string;
	committeeName?: string;
	isHeadDelegate?: boolean;
	/** Set on a conference of another account confirmed to be the same person */
	linkedAccount?: { id: string; name: string };
}

interface ConferenceSummary {
	id: string;
	title: string;
	startConference?: Date | null;
	endConference?: Date | null;
}

interface HistoryDelegation {
	assignedRole: {
		kind: ConferenceRoleKind;
		name: string | null;
		icon: string | null;
		nation: { alpha2Code: string; alpha3Code: string } | null;
	} | null;
}

/** The fields every entry takes from the conference it belongs to. */
function conferenceFields(conference: ConferenceSummary) {
	return {
		conferenceId: conference.id,
		conferenceTitle: conference.title,
		startDate: conference.startConference ?? null,
		endDate: conference.endConference ?? null
	};
}

/** A delegation's flag: its nation's, or its NSA's icon (a pointing hand when it has none). */
export function delegationFlag(delegation: HistoryDelegation | null): HistoryEntry['flag'] {
	const { nation, nonStateActor } = splitRole(delegation?.assignedRole);
	if (nation) return { type: 'nation', alpha2Code: nation.alpha2Code };
	if (!nonStateActor) return undefined;
	return { type: 'nsa', icon: nonStateActor.icon ?? 'hand-pointing' };
}

/** What a delegation was assigned: the nation's translated name, or the NSA's name. */
export function delegationAssignmentName(delegation: HistoryDelegation | null) {
	const { nation, nonStateActor } = splitRole(delegation?.assignedRole);
	if (nation) return getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code);
	return nonStateActor?.name ?? undefined;
}

export function delegationMemberEntry(dm: {
	conference: ConferenceSummary;
	delegation: HistoryDelegation | null;
	assignedCommittee: { abbreviation: string } | null;
	isHeadDelegate: boolean;
}): HistoryEntry {
	return {
		...conferenceFields(dm.conference),
		roleType: 'delegation',
		roleLabel: m.delegationMember(),
		icon: 'ph-users',
		flag: delegationFlag(dm.delegation),
		assignmentName: delegationAssignmentName(dm.delegation),
		committeeName: dm.assignedCommittee?.abbreviation,
		isHeadDelegate: dm.isHeadDelegate
	};
}

export function singleParticipantEntry(sp: {
	conference: ConferenceSummary;
	assignedRole: { name: string | null; icon: string | null } | null;
}): HistoryEntry {
	const icon = sp.assignedRole?.icon;
	return {
		...conferenceFields(sp.conference),
		roleType: 'singleParticipant',
		roleLabel: m.singleParticipant(),
		icon: 'ph-user',
		flag: icon ? { type: 'nsa', icon: icon } : undefined,
		assignmentName: sp.assignedRole?.name ?? undefined
	};
}

export function supervisorEntry(sup: { conference: ConferenceSummary }): HistoryEntry {
	return {
		...conferenceFields(sup.conference),
		roleType: 'supervisor',
		roleLabel: m.supervisor(),
		icon: 'ph-chalkboard-teacher'
	};
}

export function teamMemberEntry(tm: {
	conference: ConferenceSummary;
	role: string | null;
}): HistoryEntry {
	return {
		...conferenceFields(tm.conference),
		roleType: 'team',
		roleLabel: m.teamMember(),
		icon: 'ph-shield-check',
		assignmentName: tm.role ? translateTeamRole(tm.role) : undefined
	};
}

/** A conference an account confirmed to be the same person took part in (`possibleDuplicate`). */
export function linkedAttendanceEntry({
	attendance,
	account
}: {
	attendance: {
		conferenceId: string;
		title: string;
		startConference: Date;
		role: string;
	};
	account: { id: string; name: string };
}): HistoryEntry {
	const base = {
		conferenceId: attendance.conferenceId,
		conferenceTitle: attendance.title,
		startDate: attendance.startConference,
		endDate: null,
		linkedAccount: account
	};
	if (attendance.role === 'SINGLE_PARTICIPANT') {
		return {
			...base,
			roleType: 'singleParticipant',
			roleLabel: m.singleParticipant(),
			icon: 'ph-user'
		};
	}
	if (attendance.role === 'SUPERVISOR') {
		return {
			...base,
			roleType: 'supervisor',
			roleLabel: m.supervisor(),
			icon: 'ph-chalkboard-teacher'
		};
	}
	return { ...base, roleType: 'delegation', roleLabel: m.delegationMember(), icon: 'ph-users' };
}

/** Newest conference first; entries without a start date last. */
export function compareByStartDateDesc(a: HistoryEntry, b: HistoryEntry) {
	return (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0);
}
