import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages.js';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { translateTeamRole } from '#lib/utils/enumTranslations.js';
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
type Role = NonNullable<Parameters<typeof delegationFlag>[0]>['assignedRole'];
const nation: Role = {
	kind: 'NATION',
	name: null,
	fontAwesomeIcon: null,
	nation: { alpha2Code: 'fr', alpha3Code: 'FRA' }
};
const nsa: Role = {
	kind: 'NON_STATE_ACTOR',
	name: 'Greenpeace',
	fontAwesomeIcon: 'fa-leaf',
	nation: null
};

describe('delegationFlag', () => {
	test('the nation, the NSA, else none', () => {
		expect(delegationFlag({ assignedRole: nation })).toEqual({
			type: 'nation',
			alpha2Code: 'fr'
		});
		expect(delegationFlag({ assignedRole: nsa })).toEqual({
			type: 'nsa',
			fontAwesomeIcon: 'fa-leaf'
		});
		expect(
			delegationFlag({
				assignedRole: { kind: 'NON_STATE_ACTOR', name: 'X', fontAwesomeIcon: null, nation: null }
			})
		).toEqual({ type: 'nsa', fontAwesomeIcon: 'fa-hand-point-up' });
		expect(delegationFlag({ assignedRole: null })).toBeUndefined();
		expect(delegationFlag(null)).toBeUndefined();
	});
});

describe('delegationAssignmentName', () => {
	test('translated nation, NSA name, or nothing', () => {
		expect(delegationAssignmentName({ assignedRole: nation })).toBe(
			getFullTranslatedCountryNameFromISO3Code('FRA')
		);
		expect(delegationAssignmentName({ assignedRole: nsa })).toBe('Greenpeace');
		expect(delegationAssignmentName(null)).toBeUndefined();
	});
});

describe('entries', () => {
	test('delegation member', () => {
		expect(
			delegationMemberEntry({
				conference,
				delegation: { assignedRole: nation },
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
