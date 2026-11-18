// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const findLookup = vi.fn();
const upserted = vi.fn();
const lookupByEmail = vi.fn();

vi.mock('#api/db/db', () => ({
	db: {
		query: { slackUserLookup: { findFirst: findLookup } },
		insert: () => ({
			values: (values: unknown) => ({
				onConflictDoUpdate: () => {
					upserted(values);
					return Promise.resolve();
				}
			})
		})
	},
	schema: { slackUserLookup: { slackWorkspaceId: 'workspace', userId: 'user' } }
}));
vi.mock('./slackApi', () => ({ slackUserIdOfEmail: lookupByEmail }));
vi.mock('./slackToken', () => ({ decryptSlackToken: () => Promise.resolve('xoxb-1') }));

const { logger } = await import('#lib/logger');
const { lookupIsFresh, slackUserOf } = await import('./slackUsers');

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

describe('slackUserOf', () => {
	const workspace = { id: 'w1', botTokenCiphertext: 'sealed' };
	const user = { id: 'u1', email: ' Care@Example.org ' };
	const ask = () => slackUserOf({ workspace, user, now });

	beforeEach(() => {
		findLookup.mockReset();
		upserted.mockReset();
		lookupByEmail.mockReset();
	});

	test('answers from a fresh lookup without asking Slack', async () => {
		findLookup.mockResolvedValue({ lookedUpEmail: email, slackUserId: 'U1', checkedAt: ago(1) });
		expect(await ask()).toEqual({ connection: 'CONNECTED', slackUserId: 'U1' });
		findLookup.mockResolvedValue({ lookedUpEmail: email, slackUserId: null, checkedAt: ago(0.1) });
		expect(await ask()).toEqual({ connection: 'NOT_FOUND', slackUserId: null });
		expect(lookupByEmail).not.toHaveBeenCalled();
		expect(upserted).not.toHaveBeenCalled();
	});

	test('asks Slack by the lowercased address and keeps the answer', async () => {
		findLookup.mockResolvedValue(undefined);
		lookupByEmail.mockResolvedValue('U7');
		expect(await ask()).toEqual({ connection: 'CONNECTED', slackUserId: 'U7' });
		expect(lookupByEmail).toHaveBeenCalledWith({ token: 'xoxb-1', email });
		expect(upserted).toHaveBeenCalledWith({
			slackWorkspaceId: 'w1',
			userId: 'u1',
			lookedUpEmail: email,
			slackUserId: 'U7',
			checkedAt: now
		});
	});

	test('keeps that the address is unknown, and asks again once that is stale', async () => {
		findLookup.mockResolvedValue({ lookedUpEmail: email, slackUserId: null, checkedAt: ago(3) });
		lookupByEmail.mockResolvedValue(null);
		expect(await ask()).toEqual({ connection: 'NOT_FOUND', slackUserId: null });
		expect(upserted).toHaveBeenCalledWith(expect.objectContaining({ slackUserId: null }));
	});

	test('says so when Slack cannot be asked, logs it and keeps nothing', async () => {
		const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		findLookup.mockResolvedValue(undefined);
		lookupByEmail.mockRejectedValue(new Error('invalid_auth'));
		expect(await ask()).toEqual({ connection: 'UNAVAILABLE', slackUserId: null });
		expect(upserted).not.toHaveBeenCalled();
		expect(logged).toHaveBeenCalledOnce();
		logged.mockRestore();
	});
});
