import { describe, expect, test, vi } from 'vitest';
import { createBatcher } from './batcher';

describe('createBatcher', () => {
	test('loads the keys asked for in one turn together, each once', async () => {
		const loadMany = vi.fn(async (keys: string[]) => new Map(keys.map((key) => [key, key.length])));
		const load = createBatcher(loadMany);
		const [a, b, again] = await Promise.all([load('a'), load('bbb'), load('a')]);
		expect([a, b, again]).toEqual([1, 3, 1]);
		expect(loadMany).toHaveBeenCalledTimes(1);
		expect(loadMany).toHaveBeenCalledWith(['a', 'bbb']);
	});

	test('answers undefined for a key the load does not know, and starts a new batch afterwards', async () => {
		const loadMany = vi.fn(async () => new Map<string, number>());
		const load = createBatcher(loadMany);
		expect(await load('missing')).toBeUndefined();
		await load('later');
		expect(loadMany).toHaveBeenCalledTimes(2);
	});
});
