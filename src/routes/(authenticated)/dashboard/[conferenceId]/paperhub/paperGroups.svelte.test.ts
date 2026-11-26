import { describe, expect, test, vi } from 'vitest';

vi.mock('sveltekit-search-params', () => ({ queryParameters: () => ({}) }));

const { createPaperGroupsSnapshot } = await import('./paperGroups.svelte');

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('createPaperGroupsSnapshot', () => {
	test('is loading before its effect first runs, so nothing reads as "no papers"', () => {
		const pending = deferred<[string[], string[]]>();
		let snapshot!: ReturnType<typeof createPaperGroupsSnapshot<string[], string[]>>;
		const cleanup = $effect.root(() => {
			snapshot = createPaperGroupsSnapshot(() => pending.promise);
		});
		// Read before effects flush - what the first render sees
		expect(snapshot.loading).toBe(true);
		expect(snapshot.grouped).toBeUndefined();
		cleanup();
	});

	test('holds the loaded papers once the load resolves', async () => {
		const pending = deferred<[string[], string[]]>();
		let snapshot!: ReturnType<typeof createPaperGroupsSnapshot<string[], string[]>>;
		const cleanup = $effect.root(() => {
			snapshot = createPaperGroupsSnapshot(() => pending.promise);
		});
		pending.resolve([['grouped'], ['intro']]);
		await vi.waitFor(() => expect(snapshot.loading).toBe(false));
		expect(snapshot.grouped).toEqual(['grouped']);
		expect(snapshot.introduction).toEqual(['intro']);
		expect(snapshot.error).toBeUndefined();
		cleanup();
	});

	test('reports a failed load and stops loading', async () => {
		const pending = deferred<[string[], string[]]>();
		let snapshot!: ReturnType<typeof createPaperGroupsSnapshot<string[], string[]>>;
		const cleanup = $effect.root(() => {
			snapshot = createPaperGroupsSnapshot(() => pending.promise);
		});
		pending.reject(new Error('boom'));
		await vi.waitFor(() => expect(snapshot.loading).toBe(false));
		expect(snapshot.error).toBe('boom');
		cleanup();
	});
});
