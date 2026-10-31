import { describe, expect, it } from 'vitest';
import { schoolFilterOf, schoolFilterSchema } from './sightingDeckQuery';

describe('the school filter', () => {
	it('lets everything through when left out', () => {
		expect(schoolFilterOf({})).toBeNull();
		expect(schoolFilterOf({ schoolId: null, withoutSchool: false })).toBeNull();
	});

	it('matches a school by its id', () => {
		expect(schoolFilterOf({ schoolId: 'school-1' })).toBe('school-1');
	});

	it("matches the people without a school by ''", () => {
		expect(schoolFilterOf({ withoutSchool: true })).toBe('');
	});

	it('refuses a school and none at once', () => {
		expect(
			schoolFilterSchema.safeParse({ schoolId: 'school-1', withoutSchool: true }).success
		).toBe(false);
		expect(schoolFilterSchema.safeParse({ schoolId: 'school-1' }).success).toBe(true);
	});
});
