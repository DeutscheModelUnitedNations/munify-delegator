import { describe, expect, test } from 'vitest';
import { cleanSchoolName, schoolRenameSchema, searchSchoolsArgsSchema } from './schoolArgs';

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
