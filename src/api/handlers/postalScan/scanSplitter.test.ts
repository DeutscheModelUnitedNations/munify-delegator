// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { bytesSource } from '#lib/paperScan/intake/source';
import { splitScan, type SplitterAnswer, type SplitterQuestion } from './scanSplitter';
import { ProcessEndedError } from './scanProcess';

const { createScanProcess } = vi.hoisted(() => ({ createScanProcess: vi.fn() }));
vi.mock('./scanProcess', () => ({
	createScanProcess,
	ProcessEndedError: class ProcessEndedError extends Error {}
}));

const source = bytesSource(new Uint8Array([1, 2, 3, 4]));
const bytes = new Uint8Array([9]);
const page = (number: number): SplitterAnswer[] => [
	{ at: number },
	{ page: number, type: 'application/pdf', bytes }
];

/** What each process was told, and which says these things before it ends. */
function processes(...said: SplitterAnswer[][]) {
	const told: SplitterQuestion[][] = [];
	const stopped: boolean[] = [];
	for (const answers of said) {
		const left = [...answers];
		const own: SplitterQuestion[] = [];
		told.push(own);
		const at = stopped.push(false) - 1;
		createScanProcess.mockReturnValueOnce({
			tell: (message: SplitterQuestion) => own.push(message),
			next: async () => {
				const answer = left.shift();
				if (!answer) throw new ProcessEndedError('scanSplitter');
				return answer;
			},
			stop: () => (stopped[at] = true)
		});
	}
	return { told, stopped };
}

/** The pages as they come, broken ones marked, and how it ended. */
async function split(from = 1) {
	const pages: (number | string)[] = [];
	const cutting = splitScan({ source, from });
	for (;;) {
		const { done, value } = await cutting.next();
		if (done) return { pages, ending: value };
		pages.push('broken' in value ? `${value.page}!` : value.page);
	}
}

beforeEach(() => vi.resetAllMocks());

describe('splitScan', () => {
	test('hands over page after page, and cuts the next once one was taken', async () => {
		const { told, stopped } = processes([...page(1), ...page(2), { ended: true }]);
		expect(await split()).toEqual({ pages: [1, 2], ending: 'ended' });
		expect(told[0]).toEqual([{ size: 4, from: 1 }, { next: true }, { next: true }]);
		expect(stopped).toEqual([true]);
	});

	test('sends the parts of the file it asks for', async () => {
		const { told } = processes([{ read: { from: 1, to: 3 } }, ...page(1), { ended: true }]);
		await split();
		expect(told[0][1]).toEqual({ part: new Uint8Array([2, 3]) });
	});

	test('goes on in a new process where one had taken too much memory', async () => {
		const { told } = processes([...page(5), { leaving: true }], [...page(6), { ended: true }]);
		expect(await split(5)).toEqual({ pages: [5, 6], ending: 'ended' });
		expect(told.map(([begin]) => begin)).toEqual([
			{ size: 4, from: 5 },
			{ size: 4, from: 6 }
		]);
	});

	test('cuts on past a page that crashes two processes', async () => {
		const { told } = processes([...page(1), { at: 2 }], [{ at: 2 }], [...page(3), { ended: true }]);
		expect(await split()).toEqual({ pages: [1, '2!', 3], ending: 'ended' });
		expect(told.map(([begin]) => 'from' in begin && begin.from)).toEqual([1, 2, 3]);
	});

	test('blames no page for a process something outside ended', async () => {
		processes([{ at: 1 }], [...page(1), { ended: true }]);
		expect(await split()).toEqual({ pages: [1], ending: 'ended' });
	});

	test('tells a page that cannot be cut, and how a file ended', async () => {
		processes([{ at: 1 }, { page: 1, broken: 'no content' }, ...page(2), { unreadable: 'ends' }]);
		expect(await split()).toEqual({ pages: ['1!', 2], ending: 'fileUnreadable' });
		processes([{ refused: 'fileTypeUnknown' }]);
		expect(await split()).toEqual({ pages: [], ending: 'fileTypeUnknown' });
	});

	test('throws where a process gets to no page, or the file could not be read', async () => {
		processes([]);
		await expect(split()).rejects.toBeInstanceOf(ProcessEndedError);
		const { stopped } = processes([{ read: { from: 0, to: 1 } }]);
		const failing = { size: 4, read: () => Promise.reject(new Error('the bucket is down')) };
		const cutting = splitScan({ source: failing, from: 1 });
		await expect(cutting.next()).rejects.toThrow('the bucket is down');
		expect(stopped).toEqual([true]);
	});
});
