// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	CERTIFICATE_SECRET: 'x',
	SLACK_API_URL: 'https://slack.test'
}));
vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));

const { lookupIsFresh } = await import('./slackUsers');

const now = new Date('2026-11-15T12:00:00Z');
const ago = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const email = 'care@example.org';

describe('a kept Slack lookup', () => {
	test('holds for a month for somebody found', () => {
		const lookup = { lookedUpEmail: email, slackUserId: 'U1', checkedAt: ago(24 * 29) };
		expect(lookupIsFresh({ lookup, email, now })).toBe(true);
		expect(lookupIsFresh({ lookup: { ...lookup, checkedAt: ago(24 * 31) }, email, now })).toBe(
			false
		);
	});

	test('is asked again within the hour for somebody unknown, who may have joined since', () => {
		const lookup = { lookedUpEmail: email, slackUserId: null, checkedAt: ago(0.5) };
		expect(lookupIsFresh({ lookup, email, now })).toBe(true);
		expect(lookupIsFresh({ lookup: { ...lookup, checkedAt: ago(2) }, email, now })).toBe(false);
	});

	test('does not hold once the account has another address', () => {
		const lookup = { lookedUpEmail: 'old@example.org', slackUserId: 'U1', checkedAt: ago(1) };
		expect(lookupIsFresh({ lookup, email, now })).toBe(false);
	});

	test('is missing for somebody never asked about', () => {
		expect(lookupIsFresh({ lookup: undefined, email, now })).toBe(false);
	});
});
