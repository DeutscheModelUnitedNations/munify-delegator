import { describe, expect, test } from 'vitest';
import {
	cleanSchoolName,
	conferenceSchoolsArgsSchema,
	schoolRenameSchema,
	searchSchoolsArgsSchema
} from './schoolArgs';

describe('cleanSchoolName', () => {
	test('trims and collapses whitespace', () => {
		expect(cleanSchoolName('  Goethe   Gymnasium \n')).toBe('Goethe Gymnasium');
	});
});

describe('schoolRenameSchema', () => {
	test('refuses a name of nothing but whitespace', () => {
		expect(schoolRenameSchema.safeParse('   ').success).toBe(false);
	});

	test('takes a name, or none to keep it', () => {
		expect(schoolRenameSchema.safeParse('Goethe').success).toBe(true);
		expect(schoolRenameSchema.safeParse(null).success).toBe(true);
		expect(schoolRenameSchema.safeParse(undefined).success).toBe(true);
	});
});

describe('searchSchoolsArgsSchema', () => {
	test('asks for 10 when the limit is left out, and between 1 and 50 otherwise', () => {
		expect(searchSchoolsArgsSchema.parse({ search: 'x' }).limit).toBe(10);
		expect(searchSchoolsArgsSchema.parse({ search: 'x', limit: 0 }).limit).toBe(1);
		expect(searchSchoolsArgsSchema.parse({ search: 'x', limit: 500 }).limit).toBe(50);
	});
});

describe('conferenceSchoolsArgsSchema', () => {
	test('sorts by the participants, most first, when not told otherwise', () => {
		expect(
			conferenceSchoolsArgsSchema.parse({ conferenceId: 'c', limit: 20, offset: 0 })
		).toMatchObject({ sortColumn: 'participants', sortDesc: true });
	});

	test('keeps the page within bounds', () => {
		expect(
			conferenceSchoolsArgsSchema.parse({ conferenceId: 'c', limit: 9999, offset: -5 })
		).toMatchObject({ limit: 500, offset: 0 });
	});

	test('refuses a column the page does not have', () => {
		expect(
			conferenceSchoolsArgsSchema.safeParse({
				conferenceId: 'c',
				sortColumn: 'notes',
				limit: 20,
				offset: 0
			}).success
		).toBe(false);
	});
});
