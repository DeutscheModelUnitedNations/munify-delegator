import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPageReader, createPageReaders } from './scanReader';

const { createScanProcess } = vi.hoisted(() => ({ createScanProcess: vi.fn() }));
vi.mock('./scanProcess', () => ({ createScanProcess }));

const scan = { bytes: new Uint8Array([1]), type: 'application/pdf' as const };
const page = { page: 1, blank: false, codes: [] };

function nextProcess(...answers: (boolean | Error)[]) {
	const process = {
		ended: false,
		tell: vi.fn(),
		stop: vi.fn(),
		next: vi.fn(async () => {
			const answer = answers.shift();
			if (answer instanceof Error || answer === undefined) throw answer ?? new Error('ended');
			return { page, leaving: answer };
		})
	};
	createScanProcess.mockReturnValueOnce(process);
	return process;
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('createPageReader', () => {
	test('reads pages in one process, and in a new one after it had taken too much memory', async () => {
		const first = nextProcess(false, true);
		const second = nextProcess(false);
		const reader = createPageReader();
		for (let number = 0; number < 3; number++) expect(await reader.read(scan)).toBe(page);
		expect(first.tell).toHaveBeenCalledTimes(2);
		// one that hung ending itself would keep all it took
		expect(first.stop).toHaveBeenCalledOnce();
		expect(second.tell).toHaveBeenCalledExactlyOnceWith(scan);
	});

	test('reads on in a new process after a page ended one', async () => {
		const first = nextProcess(new Error('crashed'));
		nextProcess(false);
		const reader = createPageReader();
		await expect(reader.read(scan)).rejects.toThrow('crashed');
		expect(first.stop).toHaveBeenCalledOnce();
		expect(await reader.read(scan)).toBe(page);
	});

	test('notices a process that ended since', async () => {
		const first = nextProcess(false);
		nextProcess(false);
		const reader = createPageReader();
		await reader.read(scan);
		first.ended = true;
		expect(await reader.read(scan)).toBe(page);
		expect(createScanProcess).toHaveBeenCalledTimes(2);
	});

	test('lets a process go nobody asks anything', async () => {
		const first = nextProcess(false);
		await createPageReader().read(scan);
		await vi.advanceTimersByTimeAsync(30_001);
		expect(first.stop).toHaveBeenCalledOnce();
	});
});

describe('createPageReaders', () => {
	test('reads as many pages at once as it has processes, each in one of its own', async () => {
		vi.useRealTimers();
		const answers: ((value: { page: typeof page; leaving: boolean }) => void)[] = [];
		const processes = Array.from({ length: 2 }, () => {
			const process = {
				ended: false,
				tell: vi.fn(),
				stop: vi.fn(),
				next: vi.fn(
					() =>
						new Promise<{ page: typeof page; leaving: boolean }>((answer) => answers.push(answer))
				)
			};
			createScanProcess.mockReturnValueOnce(process);
			return process;
		});
		const readers = createPageReaders(2);
		const reads = [readers.read(scan), readers.read(scan), readers.read(scan)];
		await vi.waitFor(() => expect(answers).toHaveLength(2));
		expect(processes.map(({ tell }) => tell.mock.calls.length)).toEqual([1, 1]);
		// the third waits for one to be free
		answers.shift()?.({ page, leaving: false });
		await vi.waitFor(() => expect(answers).toHaveLength(2));
		for (const answer of answers.splice(0)) answer({ page, leaving: false });
		expect(await Promise.all(reads)).toEqual([page, page, page]);
		expect(createScanProcess).toHaveBeenCalledTimes(2);
		readers.stop();
	});
});
