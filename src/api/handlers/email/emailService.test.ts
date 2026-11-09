// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({}));
vi.mock('./mailTransport', () => ({ mailTransport: {} }));

const {
	emailLineSchema,
	emailParagraphsSchema,
	localeSchema,
	optionalEmailLineSchema,
	optionalEmailParagraphsSchema,
	optionalLocaleSchema,
	switchableKindSchema
} = await import('./emailService');

describe('the email argument schemas', () => {
	test('take the languages the app speaks and refuse others', () => {
		expect(localeSchema.parse('en')).toBe('en');
		expect(localeSchema.safeParse('xx').success).toBe(false);
	});

	test('read an empty or missing language as none', () => {
		expect(optionalLocaleSchema.parse('')).toBeUndefined();
		expect(optionalLocaleSchema.parse(null)).toBeNull();
		expect(optionalLocaleSchema.parse('de')).toBe('de');
	});

	test('keep the texts the team writes within bounds', () => {
		expect(emailLineSchema.safeParse('x'.repeat(200)).success).toBe(true);
		expect(emailLineSchema.safeParse('x'.repeat(201)).success).toBe(false);
		expect(emailParagraphsSchema.safeParse('x'.repeat(10_000)).success).toBe(true);
		expect(emailParagraphsSchema.safeParse('x'.repeat(10_001)).success).toBe(false);
	});

	test('let a preview leave the texts out, still within bounds', () => {
		// The footer editor previews without subject, heading or body.
		for (const schema of [optionalEmailLineSchema, optionalEmailParagraphsSchema]) {
			expect(schema.safeParse(undefined).success).toBe(true);
			expect(schema.safeParse(null).success).toBe(true);
		}
		expect(optionalEmailLineSchema.safeParse('x'.repeat(201)).success).toBe(false);
		expect(optionalEmailParagraphsSchema.safeParse('x'.repeat(10_001)).success).toBe(false);
	});

	test('refuse switching a kind that is always sent', () => {
		expect(switchableKindSchema.safeParse({ kind: 'TEAM_INVITATION' }).success).toBe(false);
		expect(switchableKindSchema.safeParse({ kind: 'BADGE_FOUND' }).success).toBe(false);
		expect(switchableKindSchema.safeParse({ kind: 'TEAM_WELCOME' }).success).toBe(true);
	});

	test('keep the arguments of the switch they do not check', () => {
		const args = { conferenceId: 'c', kind: 'TEAM_WELCOME', enabled: true };
		expect(switchableKindSchema.parse(args)).toEqual(args);
	});
});
