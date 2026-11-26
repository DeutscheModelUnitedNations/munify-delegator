import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ScanTask } from './scanTaskService';
import { createTaskLane } from './taskLane';

const mocks = vi.hoisted(() => ({
	claimTask: vi.fn(),
	postponeTask: vi.fn(),
	releaseTask: vi.fn(),
	renewHold: vi.fn()
}));
vi.mock('./scanTaskService', () => mocks);

const task = (overrides: Partial<ScanTask> = {}): ScanTask => ({
	id: 't',
	heldBy: 'me',
	kind: 'PAGE',
	page: 3,
	attempts: 1,
	fileId: 'f',
	pageKey: 'k',
	pageType: 'application/pdf',
	pageName: 'a_3.pdf',
	deliveryId: 'd',
	userId: 'ada',
	accessName: 'Copier',
	fileName: 'a.pdf',
	key: 'users/a',
	size: 5,
	...overrides
});

let ending = false;
const work = vi.fn<(of: ScanTask) => Promise<void>>();
const giveUp = vi.fn<(of: ScanTask) => Promise<void>>();

/** A lane with these tasks before it, done once nothing is left. */
async function run(...tasks: ScanTask[]) {
	tasks.forEach((each) => mocks.claimTask.mockResolvedValueOnce(each));
	const lane = createTaskLane({ kinds: ['PAGE'], work, giveUp, isEnding: () => ending });
	lane.wake();
	await vi.waitFor(() => expect(mocks.claimTask).toHaveBeenCalledTimes(tasks.length + 1));
	return lane;
}

beforeEach(() => {
	vi.resetAllMocks();
	ending = false;
	mocks.claimTask.mockResolvedValue(undefined);
	mocks.releaseTask.mockResolvedValue(undefined);
	work.mockResolvedValue(undefined);
	giveUp.mockResolvedValue(undefined);
});

describe('createTaskLane', () => {
	test('works on as many tasks at once as it may, and on no more', async () => {
		const waiting = Array.from({ length: 5 }, (_, index) => task({ id: `t${index}` }));
		mocks.claimTask.mockImplementation(async () => waiting.shift());
		let busy = 0;
		let most = 0;
		work.mockImplementation(async () => {
			busy += 1;
			most = Math.max(most, busy);
			await new Promise((done) => setTimeout(done, 10));
			busy -= 1;
		});
		const lane = createTaskLane({
			kinds: ['PAGE'],
			work,
			giveUp,
			isEnding: () => ending,
			parallel: 2
		});
		lane.wake();
		lane.wake();
		await vi.waitFor(() => expect(work).toHaveBeenCalledTimes(5));
		await vi.waitFor(() => expect(busy).toBe(0));
		expect(most).toBe(2);
	});

	test('lets go of everything it works on when the process ends', async () => {
		const held = [task({ id: 'a' }), task({ id: 'b' })];
		mocks.claimTask.mockImplementation(async () => held.shift());
		work.mockImplementation(() => new Promise(() => {}));
		const lane = createTaskLane({
			kinds: ['PAGE'],
			work,
			giveUp,
			isEnding: () => ending,
			parallel: 2
		});
		lane.wake();
		await vi.waitFor(() => expect(work).toHaveBeenCalledTimes(2));
		ending = true;
		await lane.release();
		expect(mocks.releaseTask.mock.calls.map(([{ of }]) => of.id).toSorted()).toEqual(['a', 'b']);
	});

	test('does one task after the other until nothing is due, telling whose turn it was', async () => {
		const turns: [string, number][][] = [];
		const waiting = [task({ userId: 'ada' }), task({ userId: 'bob' })];
		mocks.claimTask.mockImplementation(async ({ lastServed }) => {
			turns.push([...lastServed]);
			return waiting.shift();
		});
		let atOnce = 0;
		work.mockImplementation(async () => {
			expect(++atOnce).toBe(1);
			await Promise.resolve();
			atOnce--;
		});
		const lane = createTaskLane({ kinds: ['PAGE'], work, giveUp, isEnding: () => ending });
		lane.wake();
		// while it works, it is only told to look once more
		lane.wake();
		await vi.waitFor(() => expect(mocks.claimTask).toHaveBeenCalledTimes(4));
		expect(work).toHaveBeenCalledTimes(2);
		expect(turns.slice(0, 3)).toEqual([
			[],
			[['ada', 1]],
			[
				['ada', 1],
				['bob', 2]
			]
		]);
	});

	test('tries a task that failed again later, and longer each time', async () => {
		work.mockRejectedValue(new Error('S3 is down'));
		await run(task({ attempts: 1 }), task({ attempts: 4 }));
		expect(mocks.postponeTask.mock.calls.map(([{ delayMs }]) => delayMs)).toEqual([
			2 * 60_000,
			16 * 60_000
		]);
		expect(giveUp).not.toHaveBeenCalled();
	});

	test('gives up one that failed too often, or took its process down every time', async () => {
		work.mockRejectedValue(new Error('S3 is down'));
		await run(task({ attempts: 5 }), task({ attempts: 6 }));
		expect(giveUp).toHaveBeenCalledTimes(2);
		expect(work).toHaveBeenCalledOnce();
		expect(mocks.postponeTask).not.toHaveBeenCalled();
	});

	test('goes on to the next when giving one up fails', async () => {
		work.mockRejectedValue(new Error('S3 is down'));
		giveUp.mockRejectedValueOnce(new Error('so is the database'));
		const lane = createTaskLane({ kinds: ['PAGE'], work, giveUp, isEnding: () => ending });
		mocks.claimTask.mockResolvedValueOnce(task({ attempts: 5 }));
		lane.wake();
		await vi.waitFor(() => expect(giveUp).toHaveBeenCalledOnce());
		await new Promise((done) => setTimeout(done, 5));
		lane.wake();
		await vi.waitFor(() => expect(mocks.claimTask).toHaveBeenCalledTimes(2));
	});

	test('lets go of what the end of the process cuts off, and takes nothing further', async () => {
		let fail = (_error: Error) => {};
		work.mockImplementation(() => new Promise((_, reject) => (fail = reject)));
		mocks.claimTask.mockResolvedValue(task({ attempts: 5 }));
		const lane = createTaskLane({ kinds: ['PAGE'], work, giveUp, isEnding: () => ending });
		lane.wake();
		await vi.waitFor(() => expect(work).toHaveBeenCalledOnce());
		ending = true;
		await lane.release();
		expect(mocks.releaseTask).toHaveBeenCalledExactlyOnceWith({ of: task({ attempts: 5 }) });
		fail(new Error('pool closed'));
		await new Promise((done) => setTimeout(done, 5));
		expect(giveUp).not.toHaveBeenCalled();
		expect(mocks.postponeTask).not.toHaveBeenCalled();
		expect(mocks.claimTask).toHaveBeenCalledOnce();
	});
});
