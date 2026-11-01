import { describe, expect, test } from 'vitest';
import { emailsPerSecondSchema, parseEmailsPerSecond } from './emailsPerSecond';

describe('emailsPerSecondSchema', () => {
	test('takes whole numbers from 1 to 1000, or null', () => {
		expect(emailsPerSecondSchema.safeParse(1).success).toBe(true);
		expect(emailsPerSecondSchema.safeParse(1000).success).toBe(true);
		expect(emailsPerSecondSchema.safeParse(null).success).toBe(true);
		expect(emailsPerSecondSchema.safeParse(0).success).toBe(false);
		expect(emailsPerSecondSchema.safeParse(1.5).success).toBe(false);
		expect(emailsPerSecondSchema.safeParse(1001).success).toBe(false);
	});
});

describe('parseEmailsPerSecond', () => {
	test('reads a number, empty as no limit, and nothing else', () => {
		expect(parseEmailsPerSecond(' 12 ')).toBe(12);
		expect(parseEmailsPerSecond('')).toBeNull();
		expect(parseEmailsPerSecond('0')).toBeUndefined();
		expect(parseEmailsPerSecond('abc')).toBeUndefined();
		expect(parseEmailsPerSecond('2.5')).toBeUndefined();
	});
});
