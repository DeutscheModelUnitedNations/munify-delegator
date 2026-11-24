import { beforeEach, describe, expect, test, vi } from 'vitest';
import { finishDelivery, problemsOfDelivery } from './finishTask';
import type { ScanTask } from './scanTaskService';

const mocks = vi.hoisted(() => ({
	hasPagesLeft: vi.fn(),
	releaseTask: vi.fn(),
	removeDelivery: vi.fn(),
	resultsOf: vi.fn(),
	tellScanProblems: vi.fn(),
	conferencesToDeliverInto: vi.fn(),
	deleteObject: vi.fn()
}));
vi.mock('./scanTaskService', () => mocks);
vi.mock('./scanProblemNotice', () => mocks);
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => mocks);
vi.mock('#api/handlers/storedFile/storedFileService', () => mocks);

const task: ScanTask = {
	id: 't',
	heldBy: 'me',
	kind: 'FINISH',
	page: 0,
	attempts: 1,
	fileId: null,
	pageKey: null,
	pageType: null,
	pageName: null,
	deliveryId: 'd',
	userId: 'ada',
	accessName: 'Copier',
	fileName: 'a.pdf',
	key: 'users/ada/x',
	size: 5
};
const conferences = [{ conferenceId: 'conf', teamMemberId: 'member' }];

beforeEach(() => {
	vi.resetAllMocks();
	mocks.hasPagesLeft.mockResolvedValue(false);
	mocks.resultsOf.mockResolvedValue([]);
	mocks.conferencesToDeliverInto.mockResolvedValue(conferences);
	mocks.deleteObject.mockResolvedValue(undefined);
});

describe('problemsOfDelivery', () => {
	test('are those of its pages, and of the file as a whole', () => {
		const results = [
			{ page: 0, problem: { reason: 'failed' as const } },
			{ page: 1, problem: { reason: 'otherCode' as const } },
			{ page: 2 },
			{ page: 3, problem: { reason: 'otherCode' as const } }
		];
		expect(problemsOfDelivery({ file: 'a.pdf', results })).toEqual([
			{ file: 'a.pdf', pages: [1, 3], reason: 'otherCode' },
			{ file: 'a.pdf', pages: [], reason: 'failed' }
		]);
	});

	test('are none of a file of which every page was taken in', () => {
		expect(problemsOfDelivery({ file: 'a.pdf', results: [{ page: 1 }] })).toEqual([]);
	});
});

describe('finishDelivery', () => {
	test('waits for the pages', async () => {
		mocks.hasPagesLeft.mockResolvedValue(true);
		await finishDelivery(task);
		expect(mocks.releaseTask).toHaveBeenCalledWith({ of: task, delayMs: 60_000 });
		expect(mocks.removeDelivery).not.toHaveBeenCalled();
	});

	test('has told its owner once of all that came to nothing before it is gone', async () => {
		mocks.resultsOf.mockResolvedValue([
			{ page: 1, problem: { reason: 'otherCode' } },
			{ page: 2, problem: { reason: 'otherCode' } }
		]);
		let told = false;
		mocks.tellScanProblems.mockImplementation(async () => {
			await new Promise((done) => setTimeout(done, 5));
			told = true;
		});
		mocks.removeDelivery.mockImplementation(async () => expect(told).toBe(true));
		await finishDelivery(task);
		expect(mocks.tellScanProblems).toHaveBeenCalledExactlyOnceWith({
			problems: [{ file: 'a.pdf', pages: [1, 2], reason: 'otherCode' }],
			scanner: 'Copier',
			conferences
		});
		expect(mocks.deleteObject).toHaveBeenCalledWith('users/ada/x');
	});

	test('keeps it where its owner could not be told', async () => {
		mocks.resultsOf.mockResolvedValue([{ page: 1, problem: { reason: 'otherCode' } }]);
		mocks.tellScanProblems.mockRejectedValue(new Error('mail is down'));
		await expect(finishDelivery(task)).rejects.toThrow('mail is down');
		expect(mocks.removeDelivery).not.toHaveBeenCalled();
	});

	test('tells nothing where there is nothing to tell', async () => {
		mocks.resultsOf.mockResolvedValue([{ page: 1 }]);
		await finishDelivery(task);
		expect(mocks.tellScanProblems).not.toHaveBeenCalled();
		expect(mocks.removeDelivery).toHaveBeenCalledOnce();
	});
});
