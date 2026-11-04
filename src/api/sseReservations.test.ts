import { afterEach, describe, expect, test, vi } from 'vitest';
import { createHandler } from 'graphql-sse/lib/use/fetch';

/**
 * Pins our patch of graphql-sse (`patches/graphql-sse@2.6.3.patch`, graphql-sse#123): a stream
 * reserved in single connection mode that nobody connects to used to keep its operations and
 * their queued messages forever.
 */

/**
 * Handler options whose every operation is a subscription that never ends by itself and records
 * when it is stopped. `onSubscribe` hands graphql-sse the results directly, so no schema is needed.
 */
function createOptions() {
	const stopped = { count: 0 };
	const source = (): AsyncIterableIterator<{ data: { tick: string } }> => ({
		[Symbol.asyncIterator]() {
			return this;
		},
		next: () => new Promise(() => {}),
		return: async () => {
			stopped.count++;
			return { done: true, value: undefined };
		},
		// graphql-sse stops only what looks like an async generator, as graphql's subscriptions do
		throw: async (error: unknown) => {
			throw error;
		}
	});
	return { onSubscribe: () => source(), stopped };
}

const url = 'http://localhost/stream';

async function reserve(handler: (req: Request) => Promise<Response>) {
	const res = await handler(new Request(url, { method: 'PUT' }));
	expect(res.status).toBe(201);
	return res.text();
}

function subscribe({
	handler,
	token
}: {
	handler: (req: Request) => Promise<Response>;
	token: string;
}) {
	return handler(
		new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-graphql-event-stream-token': token },
			body: JSON.stringify({ query: 'subscription { tick }', extensions: { operationId: 'op' } })
		})
	);
}

describe('graphql-sse reservations', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test('a reservation nobody connects to is disposed with its operations', async () => {
		vi.useFakeTimers();
		const { onSubscribe, stopped } = createOptions();
		const handler = createHandler({ onSubscribe, reservationTimeout: 1000 });
		const token = await reserve(handler);
		expect((await subscribe({ handler, token })).status).toBe(202);

		await vi.advanceTimersByTimeAsync(999);
		expect(stopped.count).toBe(0);
		await vi.advanceTimersByTimeAsync(1);
		expect(stopped.count).toBe(1);

		// the token is gone: a late connection is refused instead of reviving it
		const late = await handler(
			new Request(url, {
				headers: { accept: 'text/event-stream', 'x-graphql-event-stream-token': token }
			})
		);
		expect(late.status).toBe(400);
	});

	test('a connected reservation is kept past the timeout', async () => {
		vi.useFakeTimers();
		const { onSubscribe, stopped } = createOptions();
		const handler = createHandler({ onSubscribe, reservationTimeout: 1000 });
		const token = await reserve(handler);
		const stream = await handler(
			new Request(url, {
				headers: { accept: 'text/event-stream', 'x-graphql-event-stream-token': token }
			})
		);
		expect(stream.status).toBe(200);
		expect((await subscribe({ handler, token })).status).toBe(202);

		await vi.advanceTimersByTimeAsync(5000);
		expect(stopped.count).toBe(0);

		await stream.body?.cancel();
		await vi.advanceTimersByTimeAsync(0);
		expect(stopped.count).toBe(1);
	});
});
