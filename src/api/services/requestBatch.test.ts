import { describe, expect, test, vi } from 'vitest';
import { requestBatch } from './requestBatch';

describe('requestBatch', () => {
	const doubled = () =>
		vi.fn(async ({ keys }: { ctx: object; keys: string[] }) => {
			return new Map(keys.map((key) => [key, `${key}${key}`]));
		});

	test('loads the keys one request asks for in one turn together', async () => {
		const load = doubled();
		const get = requestBatch(load);
		const ctx = {};
		const results = await Promise.all(['a', 'b', 'a'].map((key) => get({ ctx, key })));

		expect(results).toEqual(['aa', 'bb', 'aa']);
		expect(load).toHaveBeenCalledTimes(1);
		expect(load.mock.calls[0]?.[0].keys).toEqual(['a', 'b']);
	});

	test('keeps requests apart', async () => {
		const load = doubled();
		const get = requestBatch(load);
		await Promise.all([get({ ctx: {}, key: 'a' }), get({ ctx: {}, key: 'b' })]);

		expect(load).toHaveBeenCalledTimes(2);
	});

	test('starts a new batch once one has been sent', async () => {
		const load = doubled();
		const get = requestBatch(load);
		const ctx = {};
		await get({ ctx, key: 'a' });
		await get({ ctx, key: 'b' });

		expect(load).toHaveBeenCalledTimes(2);
	});

	test('answers undefined for a key the load did not find', async () => {
		const get = requestBatch(async () => new Map<string, string>());
		expect(await get({ ctx: {}, key: 'x' })).toBeUndefined();
	});
});
