import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createIntakeGate, IntakeBusyError } from './intakeGate';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const gate = () => createIntakeGate({ places: 3, perPerson: 1, patienceMs: 1000 });

/** A delivery held while it is received. */
function delivery(userId: string) {
	let finish = () => {};
	const held = new Promise<void>((done) => (finish = done));
	const work = vi.fn(() => held);
	return { userId, work, finish };
}

describe('createIntakeGate', () => {
	test('reads no more at once than there are places, and one person may have', async () => {
		const { run } = gate();
		const all = ['ada', 'ada', 'bob', 'carl', 'dora'].map(delivery);
		const running = all.map((each) => run(each));
		await vi.advanceTimersByTimeAsync(0);
		const read = () => all.map(({ work }) => work.mock.calls.length);
		// those after her get in although she was there before them
		expect(read()).toEqual([1, 0, 1, 1, 0]);

		all[0].finish();
		await vi.advanceTimersByTimeAsync(0);
		// in the order they came
		expect(read()).toEqual([1, 1, 1, 1, 0]);
		all.forEach(({ finish }) => finish());
		await vi.advanceTimersByTimeAsync(0);
		await Promise.all(running);
		expect(read()).toEqual([1, 1, 1, 1, 1]);
	});

	test('turns away what waited too long, without reading it', async () => {
		const { run } = gate();
		const first = delivery('ada');
		const late = delivery('ada');
		const running = run(first);
		const refused = expect(run(late)).rejects.toBeInstanceOf(IntakeBusyError);
		await vi.advanceTimersByTimeAsync(1001);
		await refused;
		expect(late.work).not.toHaveBeenCalled();
		first.finish();
		await running;
		// its place is free again
		const again = delivery('ada');
		again.finish();
		await expect(run(again)).resolves.toBeUndefined();
	});

	test('gives the place back when it fails', async () => {
		const { run } = gate();
		const broken = run({ userId: 'ada', work: () => Promise.reject(new Error('cut off')) });
		await expect(broken).rejects.toThrow('cut off');
		await expect(run({ userId: 'ada', work: async () => 2 })).resolves.toBe(2);
	});
});
