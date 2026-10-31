import { describe, expect, test } from 'vitest';
import { exceededBy, schoolSeats, schoolsOfGroup, schoolsOverLimit } from './schoolSeats';
import type { AssignmentGroup } from '#lib/assignment/state';

const kiel = { id: 'kiel', name: 'Gymnasium Kiel' };
const luebeck = { id: 'luebeck', name: 'Schule Lübeck' };

const group = (
	overrides: Partial<AssignmentGroup> & Pick<AssignmentGroup, 'key'>
): AssignmentGroup => ({
	unitId: null,
	delegationId: null,
	singleParticipantId: null,
	memberIds: [],
	size: 2,
	whole: true,
	part: false,
	target: { roleId: null },
	liveTarget: { roleId: null },
	pending: false,
	...overrides
});

/** Where the members of each delegation (`d1-0`, `d1-1`, …) come from. */
const schoolOfMembers = new Map([
	['d1', kiel],
	['d2', kiel],
	['d3', luebeck],
	['d4', null]
]);
const singleSchools = new Map([
	['s1', kiel],
	['s2', luebeck],
	['s3', luebeck]
]);
/** People merged in from elsewhere. */
const memberSchools = new Map([
	['m-luebeck', luebeck],
	['m-none', null]
]);
const lookups = {
	member: (id: string) =>
		memberSchools.has(id) ? memberSchools.get(id) : schoolOfMembers.get(id.split('-')[0]),
	single: (id: string) => singleSchools.get(id)
};
const members = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, i) => `${prefix}-${i}`);

describe('schoolSeats', () => {
	test('counts every person holding a role, single participants with a role once', () => {
		const counts = schoolSeats({
			view: {
				groups: [
					group({
						key: 'd1',
						delegationId: 'd1',
						memberIds: members('d1', 3),
						size: 3,
						target: { roleId: 'r1' }
					}),
					group({
						key: 'd2',
						delegationId: 'd2',
						memberIds: members('d2', 2),
						target: { roleId: 'r2' }
					}),
					// in the pool: no seat
					group({ key: 'd3', delegationId: 'd3', memberIds: members('d3', 4), size: 4 }),
					// no school
					group({
						key: 'd4',
						delegationId: 'd4',
						memberIds: members('d4', 2),
						target: { roleId: 'r3' }
					}),
					// a single participant the draft turns into a delegation
					group({ key: 'u1', singleParticipantId: 's3', size: 1, target: { roleId: 'r4' } })
				],
				singles: [
					{ singleParticipantId: 's1', roleId: 'press' },
					{ singleParticipantId: 's2', roleId: null }
				]
			},
			lookups
		});
		expect(counts).toEqual([
			{ schoolId: 'kiel', name: 'Gymnasium Kiel', seats: 6 },
			{ schoolId: 'luebeck', name: 'Schule Lübeck', seats: 1 }
		]);
	});

	test('counts a merged delegation towards each of its people’s schools', () => {
		const merged = group({
			key: 'd1',
			delegationId: 'd1',
			memberIds: ['m-luebeck', 'm-none', 'd1-0', 'd1-1'],
			size: 4,
			target: { roleId: 'r1' }
		});
		// someone without a school counts for none, not for the delegation's majority
		expect(schoolsOfGroup({ group: merged, lookups })).toEqual([
			{ school: luebeck, seats: 1 },
			{ school: kiel, seats: 2 }
		]);
		expect(schoolSeats({ view: { groups: [merged], singles: [] }, lookups })).toEqual([
			{ schoolId: 'kiel', name: 'Gymnasium Kiel', seats: 2 },
			{ schoolId: 'luebeck', name: 'Schule Lübeck', seats: 1 }
		]);
	});
});

describe('schoolsOverLimit', () => {
	const counts = [
		{ schoolId: 'kiel', name: 'Gymnasium Kiel', seats: 17 },
		{ schoolId: 'luebeck', name: 'Schule Lübeck', seats: 16 }
	];

	test('lists the schools past the limit only', () => {
		expect(schoolsOverLimit({ counts, limit: 16 }).map((count) => count.schoolId)).toEqual([
			'kiel'
		]);
	});

	test('is empty without a limit', () => {
		expect(schoolsOverLimit({ counts, limit: null })).toEqual([]);
	});
});

describe('exceededBy', () => {
	const counts = [{ schoolId: 'kiel', name: 'Gymnasium Kiel', seats: 15 }];

	test('tells when the added seats go past the limit', () => {
		expect(exceededBy({ counts, added: [{ school: kiel, seats: 2 }], limit: 16 })).toEqual({
			name: 'Gymnasium Kiel',
			seats: 17,
			limit: 16
		});
		expect(exceededBy({ counts, added: [{ school: kiel, seats: 1 }], limit: 16 })).toBeUndefined();
	});

	test('counts a school without seats yet from zero, and checks every school added', () => {
		expect(
			exceededBy({
				counts,
				added: [
					{ school: kiel, seats: 1 },
					{ school: luebeck, seats: 3 }
				],
				limit: 2
			})
		).toEqual({ name: 'Gymnasium Kiel', seats: 16, limit: 2 });
		expect(exceededBy({ counts: [], added: [{ school: luebeck, seats: 3 }], limit: 2 })).toEqual({
			name: 'Schule Lübeck',
			seats: 3,
			limit: 2
		});
	});

	test('says nothing without a limit or added seats', () => {
		expect(exceededBy({ counts, added: [], limit: 1 })).toBeUndefined();
		expect(
			exceededBy({ counts, added: [{ school: kiel, seats: 5 }], limit: null })
		).toBeUndefined();
		expect(exceededBy({ counts, added: [{ school: kiel, seats: 0 }], limit: 1 })).toBeUndefined();
	});
});
