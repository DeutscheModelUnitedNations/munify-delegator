import { describe, expect, test } from 'vitest';
import { remainingSeats, summarizeSchools } from './projectStats';

describe('summarizeSchools', () => {
	test('counts applications and people per school, sorted by name', () => {
		expect(
			summarizeSchools([
				{ school: 'Kiel', members: [1, 2, 3] },
				{ school: 'Altona', members: [1] },
				{ school: 'Kiel' },
				{ school: 'Kiel', members: [1, 2] }
			])
		).toEqual([
			{ school: 'Altona', count: 1, members: 1 },
			{ school: 'Kiel', count: 3, members: 6 }
		]);
	});

	test('lists applications without a school as "No School"', () => {
		expect(summarizeSchools([{ members: [1, 2] }])).toEqual([
			{ school: 'No School', count: 1, members: 2 }
		]);
	});

	test('returns nothing for no applications', () => {
		expect(summarizeSchools([])).toEqual([]);
	});
});

describe('remainingSeats', () => {
	const germany = { alpha2Code: 'de' };
	const france = { alpha2Code: 'fr' };
	const greenpeace = { id: 'gp' };
	const sources = {
		nations: [
			{ nation: germany, seats: 5 },
			{ nation: france, seats: 0 }
		],
		nsas: [{ id: 'gp', seatAmount: 2 }],
		delegations: [
			{ members: [1, 2], assignedNation: germany },
			{ members: [1], assignedNation: germany, assignedNSA: null },
			{ members: [1], assignedNSA: greenpeace },
			{ members: [1, 2, 3], assignedNation: null }
		]
	};

	test('subtracts the members of delegations assigned to a nation', () => {
		expect(remainingSeats(germany, sources)).toBe(2);
	});

	test('subtracts the members of delegations assigned to a non-state actor', () => {
		expect(remainingSeats(greenpeace, sources)).toBe(1);
	});

	test('can go negative when a nation is overbooked', () => {
		expect(
			remainingSeats(germany, {
				...sources,
				delegations: [{ members: [1, 2, 3, 4, 5, 6], assignedNation: germany }]
			})
		).toBe(-1);
	});

	test('is zero for unknown assignments or ones without seats', () => {
		expect(remainingSeats({ alpha2Code: 'xx' }, sources)).toBe(0);
		expect(remainingSeats({ id: 'unknown' }, sources)).toBe(0);
		expect(remainingSeats(france, sources)).toBe(0);
	});
});
