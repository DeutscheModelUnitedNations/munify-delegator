import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SplitEnding, SplitPage } from './scanSplitter';
import type { ScanTask } from './scanTaskService';
import { splitDelivery } from './splitTask';

const mocks = vi.hoisted(() => ({
	splitScan: vi.fn(),
	addPage: vi.fn(),
	finishSplit: vi.fn(),
	lastSplitPage: vi.fn(),
	releaseTask: vi.fn(),
	renewHold: vi.fn(),
	deleteObject: vi.fn(),
	readObjectRange: vi.fn(),
	storeGeneratedFile: vi.fn()
}));
vi.mock('./scanSplitter', () => ({ splitScan: mocks.splitScan }));
vi.mock('./scanTaskService', () => mocks);
vi.mock('#api/handlers/storedFile/storedFileService', () => mocks);
vi.mock('#api/handlers/storedFile/storageClient', () => ({ filePurpose: () => 'postalScan/scan' }));

const task: ScanTask = {
	id: 't',
	heldBy: 'me',
	kind: 'SPLIT',
	page: 0,
	attempts: 1,
	fileId: null,
	pageKey: null,
	pageType: null,
	pageName: null,
	deliveryId: 'd',
	userId: 'ada',
	accessName: 'Copier',
	fileName: 'Stapel.pdf',
	key: 'users/ada/x',
	size: 5_000_000_000
};
const bytes = new Uint8Array([1]);
const page = (number: number): SplitPage => ({ page: number, type: 'application/pdf', bytes });

/** What the file splits into, and whether it was let go of early. */
function splitsInto(pages: SplitPage[], ending: SplitEnding = 'ended') {
	const state = { left: false };
	mocks.splitScan.mockImplementation(async function* () {
		let finished = false;
		try {
			yield* pages;
			finished = true;
			return ending;
		} finally {
			state.left = !finished;
		}
	});
	return state;
}

const onPage = vi.fn();
let ending = false;
const split = () => splitDelivery({ task, onPage, isEnding: () => ending });

beforeEach(() => {
	vi.resetAllMocks();
	ending = false;
	mocks.lastSplitPage.mockResolvedValue(0);
	mocks.renewHold.mockResolvedValue(true);
	mocks.finishSplit.mockResolvedValue(true);
	mocks.deleteObject.mockResolvedValue(undefined);
	mocks.storeGeneratedFile.mockImplementation(async ({ fileName }) => `id-${fileName}`);
});

describe('splitDelivery', () => {
	test('stores and queues page after page, then drops the file', async () => {
		splitsInto([page(1), page(2)]);
		await split();
		expect(mocks.addPage.mock.calls.map(([added]) => added)).toEqual([
			{ deliveryId: 'd', page: 1, fileId: 'id-Stapel_1.pdf' },
			{ deliveryId: 'd', page: 2, fileId: 'id-Stapel_2.pdf' }
		]);
		expect(onPage).toHaveBeenCalledTimes(2);
		expect(mocks.finishSplit).toHaveBeenCalledWith({ of: task, result: undefined });
		expect(mocks.deleteObject).toHaveBeenCalledWith('users/ada/x');
	});

	test('goes on where it stopped, and reads the file in the bucket in parts', async () => {
		mocks.lastSplitPage.mockResolvedValue(41);
		splitsInto([page(42)]);
		await split();
		const [{ source, from }] = mocks.splitScan.mock.calls[0];
		expect([source.size, from]).toEqual([5_000_000_000, 42]);
		await source.read({ from: 1, to: 2 });
		expect(mocks.readObjectRange).toHaveBeenCalledWith({ key: 'users/ada/x', from: 1, to: 2 });
	});

	test('records a page that could not be cut, and how the file ended', async () => {
		splitsInto([{ page: 1, broken: 'no content' }, page(2)], 'fileUnreadable');
		await split();
		expect(mocks.addPage.mock.calls[0][0]).toEqual({
			deliveryId: 'd',
			page: 1,
			result: { problem: { reason: 'pageUnreadable' } }
		});
		expect(mocks.finishSplit).toHaveBeenCalledWith({
			of: task,
			result: { problem: { reason: 'fileUnreadable' } }
		});
	});

	test('lets somebody else’s file have its turn after a while', async () => {
		const state = splitsInto(Array.from({ length: 300 }, (_, index) => page(index + 1)));
		await split();
		expect(mocks.addPage).toHaveBeenCalledTimes(200);
		expect(mocks.releaseTask).toHaveBeenCalledWith({ of: task });
		expect(mocks.finishSplit).not.toHaveBeenCalled();
		expect(state.left).toBe(true);
	});

	test('asks whether it still holds the file only now and then', async () => {
		splitsInto(Array.from({ length: 50 }, (_, index) => page(index + 1)));
		await split();
		expect(mocks.renewHold).not.toHaveBeenCalled();
		expect(mocks.addPage).toHaveBeenCalledTimes(50);
	});

	test('stops where somebody else has the file, or the process is about to end', async () => {
		// every page takes a while
		let clock = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => (clock += 20_000));
		mocks.renewHold.mockResolvedValueOnce(true).mockResolvedValue(false);
		expect(splitsInto([page(1), page(2), page(3)])).toEqual({ left: false });
		await split();
		expect(mocks.addPage).toHaveBeenCalledOnce();
		expect(mocks.finishSplit).not.toHaveBeenCalled();

		ending = true;
		mocks.addPage.mockClear();
		splitsInto([page(1)]);
		await split();
		expect(mocks.addPage).not.toHaveBeenCalled();
		vi.restoreAllMocks();
	});

	test('keeps the file of a split that is not its own to finish', async () => {
		splitsInto([page(1)]);
		mocks.finishSplit.mockResolvedValue(false);
		await split();
		expect(mocks.deleteObject).not.toHaveBeenCalled();
	});
});
