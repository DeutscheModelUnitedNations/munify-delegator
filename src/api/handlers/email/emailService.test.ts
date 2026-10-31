// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({}));
vi.mock('./mailTransport', () => ({ mailTransport: {} }));

const { localeSchema, optionalLocaleSchema, switchableKindSchema } = await import('./emailService');

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

	test('refuse switching a kind that is always sent', () => {
		expect(switchableKindSchema.safeParse({ kind: 'TEAM_INVITATION' }).success).toBe(false);
		expect(switchableKindSchema.safeParse({ kind: 'BADGE_FOUND' }).success).toBe(false);
		expect(switchableKindSchema.safeParse({ kind: 'TEAM_WELCOME' }).success).toBe(true);
	});
});
