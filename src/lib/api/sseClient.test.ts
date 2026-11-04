// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createClient } from 'graphql-sse';

/**
 * Pins our patch of graphql-sse's client (`patches/graphql-sse@2.6.3.patch`, graphql-sse#135 /
 * PR #136): when an operation's request failed, the lazy single-connection client opened a new
 * event stream without closing the old one, so a tab could hold several, each one a connection
 * of the browser's six per host and a stream the server keeps feeding.
 */

/** A server that holds every event stream open until the client aborts it. */
function createFakeServer({ failingPosts }: { failingPosts: number }) {
	const streams: AbortSignal[] = [];
	let tokens = 0;
	let posts = 0;
	const fetchFn = async (_url: RequestInfo | URL, init: RequestInit = {}) => {
		const method = init.method ?? 'GET';
		if (method === 'PUT') return new Response(`token-${++tokens}`, { status: 201 });
		if (method === 'GET') {
			const signal = init.signal ?? new AbortController().signal;
			streams.push(signal);
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(':\n\n'));
					signal.addEventListener('abort', () => controller.error(signal.reason));
				}
			});
			return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
		}
		if (method === 'POST') {
			posts++;
			return new Response(null, { status: posts <= failingPosts ? 404 : 202 });
		}
		return new Response(null, { status: 200 });
	};
	return { fetchFn, openStreams: () => streams.filter((signal) => !signal.aborted).length };
}

const settle = () => new Promise((done) => setTimeout(done, 50));

describe('graphql-sse client', () => {
	test('a failed operation request leaves one event stream open, and none once all end', async () => {
		const server = createFakeServer({ failingPosts: 1 });
		const client = createClient({
			url: 'http://localhost/stream',
			singleConnection: true,
			fetchFn: server.fetchFn,
			retry: async () => {},
			lazyCloseTimeout: 0
		});
		const sink = { next: () => {}, error: () => {}, complete: () => {} };
		const stopFirst = client.subscribe({ query: 'subscription { a }' }, sink);
		const stopSecond = client.subscribe({ query: 'subscription { b }' }, sink);
		await settle();

		expect(server.openStreams()).toBe(1);

		stopFirst();
		stopSecond();
		await settle();
		expect(server.openStreams()).toBe(0);
		client.dispose();
	});
});
