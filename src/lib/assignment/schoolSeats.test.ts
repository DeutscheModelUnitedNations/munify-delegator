import { describe, expect, test } from 'vitest';
import { exceededBy, schoolSeats, schoolsOverLimit } from './schoolSeats';
import type { AssignmentGroup } from './state';

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

const delegationSchools = new Map([
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
const ofDelegation = (id: string) => delegationSchools.get(id);
const ofSingle = (id: string) => singleSchools.get(id);

describe('schoolSeats', () => {
	test('counts groups with a role by size and single participants with a role once', () => {
		const counts = schoolSeats(
			{
				groups: [
					group({ key: 'd1', delegationId: 'd1', size: 3, target: { roleId: 'r1' } }),
					group({ key: 'd2', delegationId: 'd2', size: 2, target: { roleId: 'r2' } }),
					// in the pool: no seat
					group({ key: 'd3', delegationId: 'd3', size: 4 }),
					// no school
					group({ key: 'd4', delegationId: 'd4', size: 2, target: { roleId: 'r3' } }),
					// a single participant the draft turns into a delegation
					group({ key: 'u1', singleParticipantId: 's3', size: 1, target: { roleId: 'r4' } })
				],
				singles: [
					{ singleParticipantId: 's1', roleId: 'press' },
					{ singleParticipantId: 's2', roleId: null }
				]
			},
			ofDelegation,
			ofSingle
		);
		expect(counts).toEqual([
			{ schoolId: 'kiel', name: 'Gymnasium Kiel', seats: 6 },
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
		expect(schoolsOverLimit(counts, 16).map((count) => count.schoolId)).toEqual(['kiel']);
	});

	test('is empty without a limit', () => {
		expect(schoolsOverLimit(counts, null)).toEqual([]);
	});
});

describe('exceededBy', () => {
	const counts = [{ schoolId: 'kiel', name: 'Gymnasium Kiel', seats: 15 }];

	test('tells when the added seats go past the limit', () => {
		expect(exceededBy(counts, kiel, 2, 16)).toEqual({
			name: 'Gymnasium Kiel',
			seats: 17,
			limit: 16
		});
		expect(exceededBy(counts, kiel, 1, 16)).toBeUndefined();
	});

	test('counts a school without seats yet from zero', () => {
		expect(exceededBy(counts, luebeck, 3, 2)).toEqual({
			name: 'Schule Lübeck',
			seats: 3,
			limit: 2
		});
	});

	test('says nothing without a school, a limit or added seats', () => {
		expect(exceededBy(counts, undefined, 5, 1)).toBeUndefined();
		expect(exceededBy(counts, kiel, 5, null)).toBeUndefined();
		expect(exceededBy(counts, kiel, 0, 1)).toBeUndefined();
	});
});
