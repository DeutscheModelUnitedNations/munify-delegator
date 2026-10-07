import { describe, expect, test } from 'vitest';
import { isOnPage, isSchoolSelected, supervisorIdsOf } from './sightingFilters';

describe('isOnPage', () => {
	test('covers the indices of the 1-based page', () => {
		expect([0, 9, 10].map((i) => isOnPage(i, 1, 10))).toEqual([true, true, false]);
		expect([9, 10, 19, 20].map((i) => isOnPage(i, 2, 10))).toEqual([false, true, true, false]);
	});
});

describe('isSchoolSelected', () => {
	test('matches the selected schools, with no school as the empty entry', () => {
		expect(isSchoolSelected(['Kiel'], 'Kiel')).toBe(true);
		expect(isSchoolSelected(['Kiel'], 'Altona')).toBe(false);
		expect(isSchoolSelected([''], undefined)).toBe(true);
		expect(isSchoolSelected(undefined, 'Kiel')).toBeUndefined();
	});
});

describe('supervisorIdsOf', () => {
	test("prefers the application's own supervisors", () => {
		expect(
			supervisorIdsOf({
				supervisors: [{ id: 'a' }],
				members: [{ supervisors: [{ id: 'b' }] }]
			})
		).toEqual(['a']);
	});

	test('falls back to every member supervisor, skipping members without any', () => {
		expect(
			supervisorIdsOf({
				members: [{ supervisors: [{ id: 'b' }, { id: '' }] }, {}, { supervisors: [{ id: 'c' }] }]
			})
		).toEqual(['b', 'c']);
	});

	test('is empty without supervisors or members', () => {
		expect(supervisorIdsOf({})).toEqual([]);
	});
});
