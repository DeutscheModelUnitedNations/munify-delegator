import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createIntakeGate, IntakeBusyError } from './intakeGate';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const gate = () =>
	createIntakeGate({ places: 3, perConference: 2, perMember: 1, patienceMs: 1000 });

/** A delivery held while it is worked on, and whether it was read yet. */
function delivery(conferenceId: string, teamMemberId: string) {
	let finish = () => {};
	const held = new Promise<void>((done) => (finish = done));
	const receive = vi.fn(async () => 'file');
	return { keys: { conferenceId, teamMemberId }, receive, work: () => held, finish };
}

describe('createIntakeGate', () => {
	test('reads no more at once than a person and a conference may have', async () => {
		const { run } = gate();
		const first = delivery('a', 'ada');
		const sameMember = delivery('a', 'ada');
		const sameConference = delivery('a', 'bob');
		const third = delivery('a', 'carl');
		const other = delivery('b', 'dora');
		const all = [first, sameMember, sameConference, third, other].map((each) => run(each));
		await vi.advanceTimersByTimeAsync(0);
		// the other conference gets in although two were there before it
		expect(
			[first, sameMember, sameConference, third, other].map(
				({ receive }) => receive.mock.calls.length
			)
		).toEqual([1, 0, 1, 0, 1]);

		first.finish();
		await vi.advanceTimersByTimeAsync(0);
		// in the order they came
		expect(sameMember.receive).toHaveBeenCalledOnce();
		expect(third.receive).not.toHaveBeenCalled();
		[sameMember, sameConference, third, other].forEach(({ finish }) => finish());
		await vi.advanceTimersByTimeAsync(0);
		await Promise.all(all);
		expect(third.receive).toHaveBeenCalledOnce();
	});

	test('turns away what waited too long, without reading it', async () => {
		const { run } = gate();
		const first = delivery('a', 'ada');
		const late = delivery('a', 'ada');
		const running = run(first);
		const refused = expect(run(late)).rejects.toBeInstanceOf(IntakeBusyError);
		await vi.advanceTimersByTimeAsync(1001);
		await refused;
		expect(late.receive).not.toHaveBeenCalled();
		first.finish();
		await running;
		// its place is free again
		const again = delivery('a', 'ada');
		again.finish();
		await expect(run(again)).resolves.toBeUndefined();
	});

	test('works on one at a time, and goes on after one that failed', async () => {
		const { run } = gate();
		const order: string[] = [];
		const failing = run({
			keys: { conferenceId: 'a', teamMemberId: 'ada' },
			receive: async () => 'x',
			work: async () => {
				order.push('first');
				throw new Error('broken');
			}
		});
		const next = run({
			keys: { conferenceId: 'b', teamMemberId: 'bob' },
			receive: async () => 'y',
			work: async () => order.push('second')
		});
		await expect(failing).rejects.toThrow('broken');
		await next;
		expect(order).toEqual(['first', 'second']);
	});

	test('gives the place back when reading fails', async () => {
		const { run } = gate();
		const keys = { conferenceId: 'a', teamMemberId: 'ada' };
		const broken = run({
			keys,
			receive: () => Promise.reject(new Error('cut off')),
			work: async () => 1
		});
		await expect(broken).rejects.toThrow('cut off');
		await expect(run({ keys, receive: async () => 1, work: async (n) => n + 1 })).resolves.toBe(2);
	});
});
