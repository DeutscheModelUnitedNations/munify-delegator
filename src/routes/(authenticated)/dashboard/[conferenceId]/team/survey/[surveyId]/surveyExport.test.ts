import { describe, expect, test } from 'vitest';
import {
	buildUserRoleMap,
	buildUserRow,
	byFamilyName,
	compareByDisplayName,
	collectNotAnswered,
	formatBirthday,
	roleInfoOf,
	type ExportDelegationMember,
	type ExportSingleParticipant,
	type ExportUser
} from './surveyExport';

function user(id: string, familyName: string | null = `Family ${id}`): ExportUser {
	return {
		id,
		givenName: `Given ${id}`,
		familyName,
		email: `${id}@example.org`,
		pronouns: null,
		birthday: null
	};
}

const nationName = (alpha3: string) => `Nation ${alpha3}`;

const nationMember: ExportDelegationMember = {
	user: user('dm1'),
	delegation: { assignedNation: { alpha3Code: 'deu' }, assignedNonStateActor: null },
	assignedCommittee: { name: 'GA' }
};
const nationMemberWithoutCommittee: ExportDelegationMember = {
	user: user('dm2'),
	delegation: { assignedNation: { alpha3Code: 'fra' }, assignedNonStateActor: null },
	assignedCommittee: null
};
const nsaMember: ExportDelegationMember = {
	user: user('dm3'),
	delegation: { assignedNation: null, assignedNonStateActor: { name: 'Greenpeace' } },
	assignedCommittee: null
};
const unassignedMember: ExportDelegationMember = {
	user: user('dm4'),
	delegation: { assignedNation: null, assignedNonStateActor: null },
	assignedCommittee: null
};
const single: ExportSingleParticipant = { user: user('sp1'), assignedRole: { name: 'Press' } };
const singleWithoutRole: ExportSingleParticipant = { user: user('sp2'), assignedRole: null };

const roleMap = buildUserRoleMap(
	[nationMember, nationMemberWithoutCommittee, nsaMember, unassignedMember],
	[single, singleWithoutRole],
	nationName
);

describe('buildUserRoleMap', () => {
	test('maps every assigned participant to their seat', () => {
		expect(Object.fromEntries(roleMap)).toEqual({
			dm1: { roleType: 'Delegation', roleName: 'Nation deu', committee: 'GA' },
			dm2: { roleType: 'Delegation', roleName: 'Nation fra', committee: '' },
			dm3: { roleType: 'NSA', roleName: 'Greenpeace', committee: '' },
			sp1: { roleType: 'SingleParticipant', roleName: 'Press', committee: '' }
		});
	});

	test('lets a single participant role win over a delegation seat', () => {
		const map = buildUserRoleMap(
			[nationMember],
			[{ user: nationMember.user, assignedRole: { name: 'Press' } }],
			nationName
		);
		expect(map.get('dm1')?.roleType).toBe('SingleParticipant');
	});
});

describe('roleInfoOf', () => {
	test('returns empty columns for users without a seat', () => {
		expect(roleInfoOf(roleMap, 'dm1').roleName).toBe('Nation deu');
		expect(roleInfoOf(roleMap, 'nobody')).toEqual({ roleType: '', roleName: '', committee: '' });
	});
});

describe('formatBirthday', () => {
	test('formats as an ISO date or leaves the cell empty', () => {
		expect(formatBirthday(new Date('2005-06-07T00:00:00Z'))).toBe('2005-06-07');
		expect(formatBirthday(null)).toBe('');
	});
});

describe('buildUserRow', () => {
	test('fills every column, empty for missing values, plus extra columns', () => {
		const row = buildUserRow(
			{ ...user('u'), familyName: null, givenName: null, email: null, pronouns: 'they/them' },
			{ roleType: 'NSA', roleName: 'Greenpeace', committee: '' },
			['Option A']
		);
		expect(row).toEqual(['u', '', '', '', 'they/them', '', 'NSA', 'Greenpeace', '', 'Option A']);
	});

	test('has no extra columns by default', () => {
		expect(buildUserRow(user('u'), roleInfoOf(roleMap, 'u'))).toHaveLength(9);
	});
});

describe('byFamilyName', () => {
	test('sorts rows by their family name column', () => {
		const rows = [
			buildUserRow(user('b', 'Zeta'), roleInfoOf(roleMap, 'b')),
			buildUserRow(user('a', 'Alpha'), roleInfoOf(roleMap, 'a'))
		];
		expect(rows.sort(byFamilyName).map((r) => r[0])).toEqual(['a', 'b']);
	});
});

describe('collectNotAnswered', () => {
	test('lists seated participants who did not answer, each once', () => {
		const result = collectNotAnswered(
			new Set(['dm2']),
			[
				nationMember,
				nationMemberWithoutCommittee,
				nsaMember,
				unassignedMember,
				single,
				nationMember
			],
			roleMap
		);
		expect(result.map((r) => r.user.id)).toEqual(['dm1', 'dm3', 'sp1']);
		expect(result[0].roleInfo.committee).toBe('GA');
	});
});

describe('compareByDisplayName', () => {
	test('sorts by the displayed name', () => {
		const people = [
			{ givenName: 'Zoe', familyName: 'A' },
			{ givenName: null, familyName: null },
			{ givenName: 'Ada', familyName: null }
		];
		expect(people.toSorted(compareByDisplayName).map((p) => p.givenName)).toEqual([
			null,
			'Ada',
			'Zoe'
		]);
	});
});
