import { describe, expect, it } from 'vitest';
import {
	delegationApplication,
	genderIcon,
	memberSummary,
	reviewArgs,
	matchReasons,
	searchFieldsOf,
	singleApplication,
	distinctSupervisors,
	entryKind,
	entryStatus,
	searchHitEntries,
	type SightingEntry
} from './sighting';

const entry = (overrides: Partial<SightingEntry>): SightingEntry => ({
	kind: 'delegation',
	id: 'x',
	codename: 'x',
	school: null,
	size: 1,
	status: 'unrated',
	...overrides
});

describe('application details', () => {
	const person = (id: string) => ({
		id,
		givenName: 'Erika',
		familyName: id,
		conferenceParticipationsCount: 0
	});
	const supervisor = { id: 'sv', user: { id: 'su', givenName: 'Max', familyName: 'Muster' } };

	it('shapes a delegation with its wishes in rank order', () => {
		const details = delegationApplication(
			{
				members: [
					{
						isHeadDelegate: true,
						user: person('1'),
						supervisors: [supervisor],
						school: { name: 'B' }
					},
					{
						isHeadDelegate: false,
						user: person('2'),
						supervisors: [supervisor],
						school: { name: 'A' }
					}
				],
				appliedForRoles: [
					{ rank: 2, role: { name: 'Amnesty', nation: null } },
					{ rank: 1, role: { nation: { alpha3Code: 'FRA', alpha2Code: 'FR' } } },
					{ rank: 3, role: {} }
				]
			},
			(code) => `name of ${code}`
		);
		expect(details.wishes).toEqual([
			{ name: 'name of FRA', alpha2Code: 'FR' },
			{ name: 'Amnesty', icon: undefined },
			{ name: '', icon: undefined }
		]);
		// the members' own schools, one line
		expect(details.school).toBe('A, B');
		expect(details.people.map((p) => [p.id, p.isHeadDelegate])).toEqual([
			['1', true],
			['2', false]
		]);
		expect(details.motivation).toBeNull();
		expect(distinctSupervisors(details.supervisors, (g, f) => `${g} ${f}`)).toEqual([
			{ id: 'sv', userId: 'su', name: 'Max Muster' }
		]);
	});

	it('shapes a single participant the same way', () => {
		const details = singleApplication({
			motivation: 'yes',
			user: person('s'),
			supervisors: [],
			appliedForRoles: [{ name: 'Press' }]
		});
		expect(details).toMatchObject({
			school: null,
			motivation: 'yes',
			people: [{ id: 's', isHeadDelegate: false }],
			wishes: [{ name: 'Press' }]
		});
	});

	it('sums up the members: average age and earlier conferences', () => {
		const born = (birthday: string | null, count: number) => ({
			...person('x'),
			birthday,
			conferenceParticipationsCount: count
		});
		expect(
			memberSummary([born('2008-01-01', 1), born('2006-01-01', 2), born(null, 0)], '2024-06-01')
		).toEqual({ averageAge: 17, participations: 3 });
		expect(memberSummary([born(null, 0)], '2024-06-01')).toEqual({
			averageAge: undefined,
			participations: 0
		});
	});

	it('collects what a search looks through, and says where a term was found', () => {
		const fields = searchFieldsOf(
			singleApplication({
				school: { name: 'Gym' },
				motivation: 'a long burning fire',
				user: { ...person('s'), email: 'a@b.c' },
				supervisors: [{ ...supervisor, user: { ...supervisor.user, email: 'max@x.y' } }],
				appliedForRoles: []
			})
		);
		const found = entry({ id: 'f', fields });
		expect(matchReasons(found, 'burning').map((r) => [r.kind, r.start, r.end])).toEqual([
			['motivation', 7, 14]
		]);
		expect(matchReasons(found, 'max@x').map((r) => [r.kind, r.start, r.end])).toEqual([
			['supervisorEmail', 0, 5]
		]);
		expect(matchReasons(found, 'muster').map((r) => r.kind)).toEqual(['supervisor']);
		expect(matchReasons(found, 'nothing')).toEqual([]);
	});

	it('picks a gender icon', () => {
		expect(genderIcon('FEMALE')).toBe('venus');
		expect(genderIcon('DIVERSE')).toBe('venus-mars');
		expect(genderIcon(null)).toBe('venus-mars');
	});
});

describe('reviewArgs', () => {
	it('sends the whole review with the change applied', () => {
		expect(reviewArgs('delegation', 'd', undefined, { flagged: true })).toEqual({
			delegationId: 'd',
			singleParticipantId: undefined,
			evaluation: undefined,
			flagged: true,
			disqualified: false,
			required: false,
			note: undefined
		});
		expect(
			reviewArgs(
				'single',
				's',
				{ evaluation: 3, flagged: true, disqualified: false, required: true, note: 'x' },
				{ evaluation: null }
			)
		).toEqual({
			delegationId: undefined,
			singleParticipantId: 's',
			evaluation: undefined,
			flagged: true,
			disqualified: false,
			required: true,
			note: 'x'
		});
	});
});

describe('deck entries from the backend', () => {
	it('reads the kind and status it sends as strings', () => {
		expect(entryKind('single')).toBe('single');
		expect(entryKind('delegation')).toBe('delegation');
		expect(entryKind('anything')).toBe('delegation');
		expect(entryStatus('rated')).toBe('rated');
		expect(entryStatus('flagged')).toBe('flagged');
		expect(entryStatus('disqualified')).toBe('disqualified');
		expect(entryStatus('noted')).toBe('unrated');
	});
});

describe('searchHitEntries', () => {
	const person = {
		id: 'p',
		givenName: 'Erika',
		familyName: 'Muster',
		conferenceParticipationsCount: 0
	};
	const hits = {
		delegations: [
			{
				id: 'd1',
				members: [
					{ isHeadDelegate: true, user: person, supervisors: [], school: { name: 'Goethe' } }
				],
				appliedForRoles: []
			}
		],
		singleParticipants: [
			{ id: 's1', school: null, user: person, supervisors: [], appliedForRoles: [] }
		],
		entries: [
			{ kind: 'delegation', id: 'd1', school: 'Goethe', size: 1, status: 'rated' },
			{ kind: 'single', id: 's1', school: null, size: 1, status: 'whatever' },
			{ kind: 'delegation', id: 'd2', school: null, size: 2, status: 'flagged' }
		]
	};
	const codename = (id: string) => `code ${id}`;

	it('finds nothing before the search has run', () => {
		expect(searchHitEntries(undefined, 'x', codename)).toEqual([]);
	});

	it('turns the hits into entries carrying what the search looked through', () => {
		const [delegation, single, unloaded] = searchHitEntries(hits, 'erika', codename);
		expect(delegation).toMatchObject({
			kind: 'delegation',
			id: 'd1',
			codename: 'code d1',
			school: 'Goethe',
			status: 'rated'
		});
		expect(delegation.fields).toContainEqual({ kind: 'member', value: 'Erika Muster' });
		expect(single).toMatchObject({ kind: 'single', id: 's1', status: 'unrated' });
		expect(single.fields).toContainEqual({ kind: 'member', value: 'Erika Muster' });
		expect(unloaded).toMatchObject({ id: 'd2', status: 'flagged', fields: undefined });
	});

	it('puts the applications whose codename or id was typed first', () => {
		expect(searchHitEntries(hits, ' S1 ', codename).map((entry) => entry.id)).toEqual([
			's1',
			'd1',
			'd2'
		]);
		expect(searchHitEntries(hits, 'd2', codename).map((entry) => entry.id)).toEqual([
			'd2',
			'd1',
			's1'
		]);
	});
});
