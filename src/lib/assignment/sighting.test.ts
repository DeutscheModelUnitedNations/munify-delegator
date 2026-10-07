import { describe, expect, it } from 'vitest';
import {
	applicationOf,
	deckPosition,
	deckStatus,
	delegationApplication,
	filterSightings,
	genderIcon,
	memberSummary,
	nextUnreviewedId,
	reviewArgs,
	schoolsOf,
	matchReasons,
	searchFieldsOf,
	singleApplication,
	distinctSupervisors,
	type SightingEntry
} from './sighting';

const entry = (overrides: Partial<SightingEntry>): SightingEntry => ({
	kind: 'delegation',
	id: 'x',
	codename: 'x',
	school: null,
	size: 1,
	review: undefined,
	...overrides
});

const entries = [
	entry({ id: 's', codename: 'single', kind: 'single', school: 'B' }),
	entry({
		id: 'a',
		codename: 'alpha',
		size: 2,
		school: 'A',
		review: { evaluation: 3, flagged: true, disqualified: false }
	}),
	entry({
		id: 'b',
		codename: 'beta',
		size: 4,
		school: 'A',
		review: { flagged: false, disqualified: true, note: 'late' }
	})
];

describe('filterSightings', () => {
	const all = { search: '', status: 'all' as const, school: null };

	it('puts large delegations first and single participants last', () => {
		expect(filterSightings(entries, all).map((e) => e.id)).toEqual(['b', 'a', 's']);
	});

	it('filters by status', () => {
		expect(filterSightings(entries, { ...all, status: 'unrated' }).map((e) => e.id)).toEqual(['s']);
		expect(filterSightings(entries, { ...all, status: 'flagged' }).map((e) => e.id)).toEqual(['a']);
		expect(filterSightings(entries, { ...all, status: 'noted' }).map((e) => e.id)).toEqual(['b']);
	});

	it('needs every search term and the school to match', () => {
		expect(filterSightings(entries, { ...all, search: 'alp a' }).map((e) => e.id)).toEqual(['a']);
		expect(filterSightings(entries, { ...all, school: 'B' }).map((e) => e.id)).toEqual(['s']);
	});

	it('also searches the text of the application and the team note', () => {
		const withText = [
			entry({ id: 't', fields: [{ kind: 'memberEmail', value: 'erika@example.org' }] }),
			entry({ id: 'n', review: { flagged: false, disqualified: false, note: 'Great speaker' } })
		];
		expect(filterSightings(withText, { ...all, search: 'ERIKA@example' }).map((e) => e.id)).toEqual(
			['t']
		);
		expect(filterSightings(withText, { ...all, search: 'speaker' }).map((e) => e.id)).toEqual([
			'n'
		]);
	});
});

describe('schoolsOf', () => {
	it('counts applications and people per school', () => {
		expect(schoolsOf(entries)).toEqual([
			{ school: 'A', applications: 2, people: 6 },
			{ school: 'B', applications: 1, people: 1 }
		]);
	});
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
				school: 'A',
				members: [
					{ isHeadDelegate: true, user: person('1'), supervisors: [supervisor] },
					{ isHeadDelegate: false, user: person('2'), supervisors: [supervisor] }
				],
				appliedForRoles: [
					{ rank: 2, nation: null, nonStateActor: { name: 'Amnesty' } },
					{ rank: 1, nation: { alpha3Code: 'FRA', alpha2Code: 'FR' } },
					{ rank: 3 }
				]
			},
			(code) => `name of ${code}`
		);
		expect(details.wishes).toEqual([
			{ name: 'name of FRA', alpha2Code: 'FR' },
			{ name: 'Amnesty', icon: undefined },
			{ name: '', icon: undefined }
		]);
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

	describe('applicationOf', () => {
		const applications = {
			delegations: [
				{ id: 'd1', school: 'S', members: [], appliedForRoles: [{ rank: 1, nation: null }] }
			],
			singleParticipants: [
				{ id: 's1', user: person('s1'), supervisors: [], appliedForRoles: [{ name: 'Press' }] }
			]
		};

		it('finds the application of either kind, or nothing', () => {
			expect(applicationOf({ kind: 'delegation', id: 'd1' }, applications, String)?.school).toBe(
				'S'
			);
			expect(applicationOf({ kind: 'single', id: 's1' }, applications, String)?.wishes).toEqual([
				{ name: 'Press' }
			]);
			expect(applicationOf({ kind: 'single', id: 'd1' }, applications, String)).toBeUndefined();
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
				school: 'Gym',
				motivation: 'a long burning fire',
				user: { ...person('s'), email: 'a@b.c' },
				supervisors: [{ ...supervisor, user: { ...supervisor.user, email: 'max@x.y' } }],
				appliedForRoles: []
			})
		);
		const found = entry({ id: 'f', fields });
		expect(matchReasons(found, 'burning max@x').map((r) => [r.kind, r.start, r.end])).toEqual([
			['motivation', 7, 14],
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
			note: undefined
		});
		expect(
			reviewArgs(
				'single',
				's',
				{ evaluation: 3, flagged: true, disqualified: false, note: 'x' },
				{ evaluation: null }
			)
		).toEqual({
			delegationId: undefined,
			singleParticipantId: 's',
			evaluation: undefined,
			flagged: true,
			disqualified: false,
			note: 'x'
		});
	});
});

describe('deck status priorities', () => {
	it('shows a rating green even when flagged, and an exclusion red over everything', () => {
		const review = (r: object) => entry({ review: { flagged: false, disqualified: false, ...r } });
		expect(deckStatus(review({ evaluation: 3, flagged: true }))).toBe('rated');
		expect(deckStatus(review({ evaluation: 3, disqualified: true }))).toBe('disqualified');
	});
});

describe('the deck', () => {
	const deck = [
		entry({ id: 'a', review: { evaluation: 4, flagged: false, disqualified: false } }),
		entry({ id: 'b' }),
		entry({ id: 'c', review: { flagged: true, disqualified: false } }),
		entry({ id: 'd' }),
		entry({ id: 'e', review: { flagged: true, disqualified: true } })
	];

	it('tells how far along an application is, the strictest mark first', () => {
		expect(deck.map(deckStatus)).toEqual([
			'rated',
			'unrated',
			'flagged',
			'unrated',
			'disqualified'
		]);
	});

	it('finds the neighbours of the current card', () => {
		expect(deckPosition(deck, 'c')).toMatchObject({
			index: 2,
			total: 5,
			previousId: 'b',
			nextId: 'd',
			current: { id: 'c' }
		});
		expect(deckPosition(deck, 'a').previousId).toBeUndefined();
		expect(deckPosition(deck, 'e').nextId).toBeUndefined();
	});

	it('falls back to the first card for an id outside the deck, and copes with an empty one', () => {
		expect(deckPosition(deck, 'gone')).toMatchObject({ index: 0, current: { id: 'a' } });
		expect(deckPosition(deck, undefined).index).toBe(0);
		expect(deckPosition([], 'a')).toMatchObject({ total: 0, current: undefined });
	});

	it('jumps to the next unreviewed card, wrapping around', () => {
		expect(nextUnreviewedId(deck, 'a')).toBe('b');
		expect(nextUnreviewedId(deck, 'b')).toBe('d');
		expect(nextUnreviewedId(deck, 'd')).toBe('b');
		expect(
			nextUnreviewedId(
				deck.filter((e) => e.id !== 'b' && e.id !== 'd'),
				'a'
			)
		).toBeUndefined();
	});
});
