import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPubSub } from 'graphql-yoga';
import type { GraphQLError } from 'graphql';

const config = vi.hoisted(() => ({ current: undefined as { remoteUrl: string } | undefined }));
vi.mock('#api/rumble', () => ({
	instanceSignals: createPubSub<{ linkSyncRequested: [request: { at: string }] }>()
}));
vi.mock('./linkAuth', () => ({
	LINK_TOKEN_HEADER: 'x-munify-link-token',
	linkConfig: () => config.current,
	linkAccessToken: async () => 'link-token'
}));

const { followSyncRequests, requestLinkSync, requestRemoteLinkSync } = await import('./linkSync');
const { instanceSignals } = await import('#api/rumble');

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
	config.current = undefined;
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('requestLinkSync', () => {
	test('answers false and signals nothing while unlinked', async () => {
		const heard = vi.fn();
		const stop = followSyncRequests({
			requests: instanceSignals.subscribe('linkSyncRequested'),
			sync: heard
		});
		expect(requestLinkSync()).toBe(false);
		await settled();
		expect(heard).not.toHaveBeenCalled();
		stop();
	});

	test('signals the instance running the worker, which reads everything again', async () => {
		config.current = { remoteUrl: 'https://chase.example' };
		const sync = vi.fn();
		const stop = followSyncRequests({
			requests: instanceSignals.subscribe('linkSyncRequested'),
			sync
		});
		await settled();
		expect(requestLinkSync()).toBe(true);
		await settled();
		expect(sync).toHaveBeenCalledTimes(1);
		stop();
	});
});

describe('followSyncRequests', () => {
	beforeEach(() => vi.useFakeTimers());

	/** Requests that arrive when `push` is called. */
	function requestsSource() {
		const waiting: ((result: IteratorResult<unknown>) => void)[] = [];
		const queued: unknown[] = [];
		let done = false;
		const requests: AsyncIterableIterator<unknown> = {
			next: () =>
				queued.length > 0
					? Promise.resolve({ value: queued.shift(), done: false })
					: done
						? Promise.resolve({ value: undefined, done: true })
						: new Promise((resolve) => waiting.push(resolve)),
			return: () => {
				done = true;
				for (const resolve of waiting.splice(0)) resolve({ value: undefined, done: true });
				return Promise.resolve({ value: undefined, done: true });
			},
			[Symbol.asyncIterator]() {
				return requests;
			}
		};
		const push = async () => {
			const resolve = waiting.shift();
			if (resolve) resolve({ value: {}, done: false });
			else queued.push({});
			await vi.advanceTimersByTimeAsync(0);
		};
		return { requests, push };
	}

	test('syncs at once, and a burst after it once more when the spacing has passed', async () => {
		const { requests, push } = requestsSource();
		const sync = vi.fn();
		const stop = followSyncRequests({ requests, sync, spacingMs: 1_000 });
		await push();
		expect(sync).toHaveBeenCalledTimes(1);
		await push();
		await push();
		await push();
		expect(sync).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1_000);
		expect(sync).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(5_000);
		expect(sync).toHaveBeenCalledTimes(2);
		stop();
	});

	test('stopping drops a sync still waiting', async () => {
		const { requests, push } = requestsSource();
		const sync = vi.fn();
		const stop = followSyncRequests({ requests, sync, spacingMs: 1_000 });
		await push();
		await push();
		stop();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(sync).toHaveBeenCalledTimes(1);
	});
});

describe('requestRemoteLinkSync', () => {
	test('answers false without asking anyone while unlinked', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await expect(requestRemoteLinkSync()).resolves.toBe(false);
		expect(fetch).not.toHaveBeenCalled();
	});

	test("asks CHASE's requestLinkSync with the link token", async () => {
		config.current = { remoteUrl: 'https://chase.example' };
		const fetch = vi.fn(async () => Response.json({ data: { requestLinkSync: true } }));
		vi.stubGlobal('fetch', fetch);
		await expect(requestRemoteLinkSync()).resolves.toBe(true);
		const [url, init] = fetch.mock.calls[0] as unknown as [
			URL,
			{ headers: Record<string, string>; body: string }
		];
		expect(url.toString()).toBe('https://chase.example/api/graphql');
		expect(init.headers).toMatchObject({ 'x-munify-link-token': 'link-token' });
		expect(String(init.body)).toContain('requestLinkSync');
	});

	test('a CHASE that is away or refuses is a CONFLICT, which leaves the sync here alone', async () => {
		config.current = { remoteUrl: 'https://chase.example' };
		vi.stubGlobal('fetch', async () => {
			throw new TypeError('fetch failed');
		});
		const away = await requestRemoteLinkSync().catch((error: GraphQLError) => error);
		expect((away as GraphQLError).extensions.code).toBe('CONFLICT');

		vi.stubGlobal('fetch', async () =>
			Response.json({ errors: [{ message: 'Forbidden' }], data: null })
		);
		const refused = await requestRemoteLinkSync().catch((error: GraphQLError) => error);
		expect((refused as GraphQLError).extensions.code).toBe('CONFLICT');

		// the request here does not depend on CHASE
		expect(requestLinkSync()).toBe(true);
	});
});
