import { describe, expect, test } from 'vitest';
import {
	assignedMemberCounts,
	exactSizeWarnings,
	isOutsideSizeLimits,
	matchesSeatFilters,
	nationSeatCounts,
	parseSizeLimits,
	regionalBalance,
	rolesOf,
	seatedByGroup,
	seatsWithPending,
	singleSeatRoles,
	sizeHistogram,
	type PlanningCommittee
} from '$lib/services/seatPlanning/hints';
import { unMembers, type UnMember } from '$lib/services/seatPlanning/unMembers';

const committees: PlanningCommittee[] = [
	{ id: 'gv', numOfSeatsPerDelegation: 1, nations: ['deu', 'fra', 'usa', 'chn'] },
	{ id: 'sr', numOfSeatsPerDelegation: 2, nations: ['deu', 'usa'] },
	{ id: 'wiso', numOfSeatsPerDelegation: 1, nations: ['deu'] }
];

describe('nationSeatCounts', () => {
	test('sums the seats per delegation of every committee a nation sits in', () => {
		const counts = nationSeatCounts(committees);
		expect(counts.get('deu')).toBe(4);
		expect(counts.get('usa')).toBe(3);
		expect(counts.get('fra')).toBe(1);
		expect(counts.get('gbr')).toBeUndefined();
	});
});

describe('rolesOf and sizeHistogram', () => {
	const roles = rolesOf(nationSeatCounts(committees), [
		{ id: 'greenpeace', seatAmount: 3 },
		{ id: 'icrc', seatAmount: 1 }
	]);

	test('combines seated nations and NSAs', () => {
		expect(roles).toHaveLength(6);
		expect(roles.filter((role) => role.kind === 'nsa')).toHaveLength(2);
	});

	test('counts roles per size, ascending', () => {
		expect(sizeHistogram(roles)).toEqual([
			{ size: 1, count: 3 },
			{ size: 3, count: 2 },
			{ size: 4, count: 1 }
		]);
	});

	test('flags single-seat roles', () => {
		expect(singleSeatRoles(roles).map((role) => role.id)).toEqual(['fra', 'chn', 'icrc']);
	});

	test('ignores nations without a seat', () => {
		expect(rolesOf(new Map([['deu', 0]]), [])).toEqual([]);
	});
});

describe('exactSizeWarnings', () => {
	test('warns about sizes with fewer than three roles and suggests nations one seat away', () => {
		const roles = rolesOf(
			new Map([
				['a', 2],
				['b', 2],
				['c', 2],
				['d', 3],
				['e', 4]
			]),
			[{ id: 'nsa', seatAmount: 3 }]
		);

		const warnings = exactSizeWarnings(roles);
		expect(warnings.map(({ size, count }) => ({ size, count }))).toEqual([
			{ size: 3, count: 2 },
			{ size: 4, count: 1 }
		]);
		// NSAs are never suggested, only states can gain or lose committee seats
		expect(warnings[0].candidates.map((role) => role.id)).toEqual(['a', 'b', 'c', 'e']);
		expect(warnings[1].candidates.map((role) => role.id)).toEqual(['d']);
	});

	test('is quiet when every size has enough roles', () => {
		const roles = rolesOf(
			new Map([
				['a', 2],
				['b', 2],
				['c', 2]
			]),
			[]
		);
		expect(exactSizeWarnings(roles)).toEqual([]);
	});
});

describe('isOutsideSizeLimits', () => {
	test('respects min and max independently', () => {
		expect(isOutsideSizeLimits(1, { min: 2, max: null })).toBe(true);
		expect(isOutsideSizeLimits(2, { min: 2, max: null })).toBe(false);
		expect(isOutsideSizeLimits(7, { min: null, max: 6 })).toBe(true);
		expect(isOutsideSizeLimits(6, { min: 2, max: 6 })).toBe(false);
	});

	test('never flags unseated nations or missing limits', () => {
		expect(isOutsideSizeLimits(0, { min: 2, max: 6 })).toBe(false);
		expect(isOutsideSizeLimits(12, { min: null, max: null })).toBe(false);
	});
});

describe('regionalBalance', () => {
	const member = (alpha3Code: string, regionalGroup: UnMember['regionalGroup']): UnMember => ({
		alpha3Code,
		alpha2Code: alpha3Code.slice(0, 2),
		regionalGroup,
		region: '',
		subregion: '',
		capital: [],
		languages: [],
		borders: [],
		landlocked: false
	});
	// 50 % African, 25 % WEOG, 25 % Eastern European
	const members = [
		member('af1', 'African Group'),
		member('af2', 'African Group'),
		member('af3', 'African Group'),
		member('af4', 'African Group'),
		member('we1', 'Western European and Others Group'),
		member('we2', 'Western European and Others Group'),
		member('ee1', 'Eastern European Group'),
		member('ee2', 'Eastern European Group')
	];

	test('flags groups deviating beyond the threshold and suggests the smallest delegations', () => {
		const committee = {
			id: 'gv',
			numOfSeatsPerDelegation: 1,
			nations: ['we1', 'we2', 'af1', 'ee1']
		};
		const seatCounts = new Map([
			['af2', 3],
			['af3', 1]
		]);

		const hints = regionalBalance([committee], members, seatCounts);
		const african = hints.find((hint) => hint.group === 'African Group');
		const weog = hints.find((hint) => hint.group === 'Western European and Others Group');

		expect(african).toMatchObject({ seatShare: 25, memberShare: 50, deviation: -25 });
		expect(african?.suggestions).toEqual(['af4', 'af3', 'af2']);
		expect(weog).toMatchObject({ seatShare: 50, memberShare: 25, deviation: 25, suggestions: [] });
		// Eastern Europe holds exactly its share
		expect(hints.some((hint) => hint.group === 'Eastern European Group')).toBe(false);
	});

	test('respects the threshold and skips empty committees', () => {
		const committee = {
			id: 'gv',
			numOfSeatsPerDelegation: 1,
			nations: ['we1', 'af1', 'af2', 'ee1']
		};
		expect(regionalBalance([committee], members, new Map(), 5)).toEqual([]);
		expect(regionalBalance([{ ...committee, nations: [] }], members, new Map())).toEqual([]);
	});
});

describe('unMembers and seatedByGroup', () => {
	test('lists exactly the 193 UN member states, without the Holy See', () => {
		expect(unMembers).toHaveLength(193);
		expect(unMembers.some((member) => member.alpha3Code === 'vat')).toBe(false);
	});

	test('counts seated and unseated members per group', () => {
		const african = seatedByGroup(unMembers, new Map([['egy', 4]])).find(
			(entry) => entry.group === 'African Group'
		);
		expect(african).toEqual({ group: 'African Group', total: 54, seated: 1, unseated: 53 });
	});
});

describe('parseSizeLimits', () => {
	test('accepts positive integers and drops everything else', () => {
		expect(parseSizeLimits({ min: 2, max: 6 })).toEqual({ min: 2, max: 6 });
		expect(parseSizeLimits({ min: 0, max: 2.5 })).toEqual({ min: null, max: null });
		expect(parseSizeLimits({ min: '3' })).toEqual({ min: null, max: null });
		expect(parseSizeLimits(null)).toEqual({ min: null, max: null });
		expect(parseSizeLimits('garbage')).toEqual({ min: null, max: null });
	});
});

describe('matchesSeatFilters', () => {
	const germany = {
		name: 'Deutschland',
		alpha2Code: 'de',
		alpha3Code: 'deu',
		regionalGroup: 'Western European and Others Group' as const
	};
	const none = { q: null, group: null, noSeat: null, size: null };

	test('passes without filters', () => {
		expect(matchesSeatFilters(germany, 3, none)).toBe(true);
	});

	test('searches the localized name and the ISO codes', () => {
		expect(matchesSeatFilters(germany, 3, { ...none, q: 'deutsch' })).toBe(true);
		expect(matchesSeatFilters(germany, 3, { ...none, q: ' DE ' })).toBe(true);
		expect(matchesSeatFilters(germany, 3, { ...none, q: 'deu' })).toBe(true);
		expect(matchesSeatFilters(germany, 3, { ...none, q: 'frank' })).toBe(false);
	});

	test('filters by group, missing seat and exact size', () => {
		expect(matchesSeatFilters(germany, 3, { ...none, group: 'African Group' })).toBe(false);
		expect(matchesSeatFilters(germany, 3, { ...none, noSeat: true })).toBe(false);
		expect(matchesSeatFilters(germany, 0, { ...none, noSeat: true })).toBe(true);
		expect(matchesSeatFilters(germany, 3, { ...none, size: 3 })).toBe(true);
		expect(matchesSeatFilters(germany, 3, { ...none, size: 2 })).toBe(false);
	});
});

describe('assignedMemberCounts', () => {
	test('splits the assigned delegations into nations and NSAs', () => {
		const counts = assignedMemberCounts([
			{ nationAlpha3Code: 'deu', nonStateActorId: null, memberCount: 4 },
			{ nationAlpha3Code: null, nonStateActorId: 'icrc', memberCount: 2 }
		]);
		expect(counts.nations).toEqual(new Map([['deu', 4]]));
		expect(counts.nonStateActors).toEqual(new Map([['icrc', 2]]));
	});
});

describe('seatsWithPending', () => {
	test('applies unconfirmed additions and removals on top of the saved seats', () => {
		const seats = seatsWithPending(
			[
				{ id: 'gv', nations: [{ alpha3Code: 'deu' }, { alpha3Code: 'fra' }] },
				{ id: 'sr', nations: [] }
			],
			[
				{ committeeId: 'gv', nationAlpha3Code: 'fra', enabled: false },
				{ committeeId: 'sr', nationAlpha3Code: 'usa', enabled: true },
				{ committeeId: 'unknown', nationAlpha3Code: 'chn', enabled: true }
			]
		);
		expect(seats.get('gv')).toEqual(new Set(['deu']));
		expect(seats.get('sr')).toEqual(new Set(['usa']));
		expect(seats.has('unknown')).toBe(false);
	});
});
