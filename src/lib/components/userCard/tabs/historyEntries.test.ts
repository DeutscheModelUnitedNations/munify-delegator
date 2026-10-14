import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { translateTeamRole } from '$lib/utils/enumTranslations';
import {
	compareByStartDateDesc,
	delegationAssignmentName,
	delegationFlag,
	delegationMemberEntry,
	singleParticipantEntry,
	supervisorEntry,
	teamMemberEntry
} from './historyEntries';

const start = new Date('2025-03-01');
const end = new Date('2025-03-04');
const conference = { id: 'c1', title: 'MUN-SH', startConference: start, endConference: end };
const nation = { alpha2Code: 'fr', alpha3Code: 'FRA' };
const nsa = { name: 'Greenpeace', fontAwesomeIcon: 'fa-leaf' };

describe('delegationFlag', () => {
	test('nation first, then NSA, else none', () => {
		expect(delegationFlag({ assignedNation: nation, assignedNonStateActor: nsa })).toEqual({
			type: 'nation',
			alpha2Code: 'fr'
		});
		expect(delegationFlag({ assignedNation: null, assignedNonStateActor: nsa })).toEqual({
			type: 'nsa',
			fontAwesomeIcon: 'fa-leaf'
		});
		expect(
			delegationFlag({
				assignedNation: null,
				assignedNonStateActor: { name: 'X', fontAwesomeIcon: null }
			})
		).toEqual({ type: 'nsa', fontAwesomeIcon: 'fa-hand-point-up' });
		expect(delegationFlag({ assignedNation: null, assignedNonStateActor: null })).toBeUndefined();
		expect(delegationFlag(null)).toBeUndefined();
	});
});

describe('delegationAssignmentName', () => {
	test('translated nation, NSA name, or nothing', () => {
		expect(delegationAssignmentName({ assignedNation: nation, assignedNonStateActor: null })).toBe(
			getFullTranslatedCountryNameFromISO3Code('FRA')
		);
		expect(delegationAssignmentName({ assignedNation: null, assignedNonStateActor: nsa })).toBe(
			'Greenpeace'
		);
		expect(delegationAssignmentName(null)).toBeUndefined();
	});
});

describe('entries', () => {
	test('delegation member', () => {
		expect(
			delegationMemberEntry({
				conference,
				delegation: { assignedNation: nation, assignedNonStateActor: null },
				assignedCommittee: { abbreviation: 'GA' },
				isHeadDelegate: true
			})
		).toEqual({
			conferenceId: 'c1',
			conferenceTitle: 'MUN-SH',
			startDate: start,
			endDate: end,
			roleType: 'delegation',
			roleLabel: m.delegationMember(),
			icon: 'fa-users',
			flag: { type: 'nation', alpha2Code: 'fr' },
			assignmentName: getFullTranslatedCountryNameFromISO3Code('FRA'),
			committeeName: 'GA',
			isHeadDelegate: true
		});
		expect(
			delegationMemberEntry({
				conference: { id: 'c2', title: 'T' },
				delegation: null,
				assignedCommittee: null,
				isHeadDelegate: false
			})
		).toMatchObject({ startDate: null, endDate: null, committeeName: undefined });
	});

	test('single participant', () => {
		expect(
			singleParticipantEntry({
				conference,
				assignedRole: { name: 'Press', fontAwesomeIcon: 'fa-camera' }
			})
		).toMatchObject({
			roleType: 'singleParticipant',
			flag: { type: 'nsa', fontAwesomeIcon: 'fa-camera' },
			assignmentName: 'Press'
		});
		expect(
			singleParticipantEntry({ conference, assignedRole: { name: 'P', fontAwesomeIcon: null } })
				.flag
		).toBeUndefined();
		expect(singleParticipantEntry({ conference, assignedRole: null })).toMatchObject({
			flag: undefined,
			assignmentName: undefined
		});
	});

	test('supervisor and team member', () => {
		expect(supervisorEntry({ conference })).toMatchObject({
			roleType: 'supervisor',
			roleLabel: m.supervisor(),
			icon: 'fa-chalkboard-user'
		});
		expect(teamMemberEntry({ conference, role: 'ADMIN' })).toMatchObject({
			roleType: 'team',
			assignmentName: translateTeamRole('ADMIN')
		});
		expect(teamMemberEntry({ conference, role: null }).assignmentName).toBeUndefined();
	});
});

describe('compareByStartDateDesc', () => {
	test('newest first, undated last', () => {
		const a = supervisorEntry({ conference: { ...conference, startConference: new Date(1000) } });
		const b = supervisorEntry({ conference: { ...conference, startConference: new Date(2000) } });
		const c = supervisorEntry({ conference: { id: 'x', title: 'x' } });
		expect([a, c, b].sort(compareByStartDateDesc)).toEqual([b, a, c]);
	});
});
