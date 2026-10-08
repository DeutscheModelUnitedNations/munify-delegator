import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingMoves } from './pendingMoves.svelte';

describe('PendingMoves', () => {
	// Where the board shows each card; tests move cards by changing it.
	let places: Map<string, string>;
	let moves: PendingMoves;

	beforeEach(() => {
		vi.useFakeTimers();
		places = new Map([['a', 'pool']]);
		moves = new PendingMoves((key) => places.get(key) ?? 'gone');
	});
	afterEach(() => vi.useRealTimers());

	it('holds a card from the drop until the board shows it elsewhere', async () => {
		let finish: (done: boolean) => void = () => {};
		const tracked = moves.track('a', () => new Promise<boolean>((resolve) => (finish = resolve)));
		expect(moves.has('a')).toBe(true);

		finish(true);
		await tracked;
		// The mutation answered, but the live queries have not caught up yet.
		moves.settle();
		expect(moves.has('a')).toBe(true);

		places.set('a', 'nation:FRA');
		moves.settle();
		expect(moves.has('a')).toBe(false);
	});

	it('counts a card whose key went away as moved', async () => {
		await moves.track('a', async () => true);
		places.delete('a');
		moves.settle();
		expect(moves.size).toBe(0);
	});

	it('frees a card at once when its change fails', async () => {
		await moves.track('a', async () => false);
		expect(moves.has('a')).toBe(false);
	});

	it('frees a card the board never shows elsewhere after a while', async () => {
		await moves.track('a', async () => true);
		moves.settle();
		expect(moves.has('a')).toBe(true);
		vi.advanceTimersByTime(10_000);
		expect(moves.has('a')).toBe(false);
	});

	it('tracks cards independently', async () => {
		places.set('b', 'pool');
		await Promise.all([moves.track('a', async () => true), moves.track('b', async () => true)]);
		places.set('b', 'nation:DEU');
		moves.settle();
		expect([moves.has('a'), moves.has('b')]).toEqual([true, false]);
	});
});
