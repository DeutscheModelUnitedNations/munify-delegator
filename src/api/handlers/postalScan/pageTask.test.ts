import { beforeEach, describe, expect, test, vi } from 'vitest';
import { takeInPageTask } from './pageTask';
import type { ScanTask } from './scanTaskService';

const mocks = vi.hoisted(() => ({
	findFirst: vi.fn(),
	conferencesToDeliverInto: vi.fn(),
	verifyCode: vi.fn(),
	readStoredFile: vi.fn(),
	storeGeneratedFile: vi.fn(),
	finishPage: vi.fn(),
	takeInPage: vi.fn(),
	read: vi.fn()
}));
vi.mock('#api/db/db', () => ({
	db: { query: { conferenceParticipant: { findFirst: mocks.findFirst } } }
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => mocks);
vi.mock('#api/handlers/signedCode/signedCodeService', () => mocks);
vi.mock('#api/handlers/storedFile/storedFileService', () => mocks);
vi.mock('./scanTaskService', () => mocks);
vi.mock('./takeInPage', () => mocks);

const task: ScanTask = {
	id: 't',
	heldBy: 'me',
	kind: 'PAGE',
	page: 7,
	attempts: 1,
	fileId: 'file-7',
	pageKey: 'users/ada/page-7',
	pageType: 'application/pdf',
	pageName: 'a_7.pdf',
	deliveryId: 'd',
	userId: 'ada',
	accessName: 'Copier',
	fileName: 'a.pdf',
	key: 'users/ada/x',
	size: 5
};
const take = () => takeInPageTask({ task, reader: { read: mocks.read } });

beforeEach(() => {
	vi.resetAllMocks();
	mocks.readStoredFile.mockResolvedValue(new TextEncoder().encode('%PDF-1.7'));
	mocks.conferencesToDeliverInto.mockResolvedValue([
		{ conferenceId: 'conf', teamMemberId: 'member' }
	]);
	mocks.read.mockResolvedValue({
		page: 1,
		blank: false,
		codes: [{ text: 'code', readings: [{ field: 'termsSignature', state: 'yes' }] }]
	});
	mocks.verifyCode.mockResolvedValue({
		valid: true,
		code: 'code',
		claims: { kind: 'print', userId: 'bob', conferenceId: 'conf', issuedAt: 0 }
	});
	mocks.findFirst.mockResolvedValue({ id: 'bobs-row' });
	mocks.takeInPage.mockResolvedValue('stored');
});

describe('takeInPageTask', () => {
	test('keeps the page for its person, as the file it was cut out as', async () => {
		await take();
		expect(mocks.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: 'bob', conferenceId: 'conf' } })
		);
		const [kept] = mocks.takeInPage.mock.calls[0];
		expect(kept).toMatchObject({
			participantId: 'bobs-row',
			source: 'WEBDAV',
			uploadedById: 'ada'
		});
		expect(await kept.storeFile()).toBe('file-7');
		expect(mocks.finishPage).toHaveBeenCalledWith({
			of: task,
			result: { problem: undefined, ignored: undefined }
		});
	});

	test('keeps a page that lay otherwise as its file turned upright, which it stores only then', async () => {
		const upright = new TextEncoder().encode('%PDF-1.7 turned');
		const read = await mocks.read();
		mocks.read.mockResolvedValue({ ...read, upright });
		mocks.storeGeneratedFile.mockResolvedValue('file-turned');
		await take();
		expect(mocks.storeGeneratedFile).not.toHaveBeenCalled();
		const [kept] = mocks.takeInPage.mock.calls[0];
		expect(await kept.storeFile()).toBe('file-turned');
		expect(mocks.storeGeneratedFile).toHaveBeenCalledExactlyOnceWith({
			userId: 'ada',
			purpose: 'postalScan/scan',
			fileName: 'a_7.pdf',
			mimeType: 'application/pdf',
			bytes: upright
		});
	});

	test('keeps nothing of a conference the owner may not upload scans in now', async () => {
		mocks.conferencesToDeliverInto.mockResolvedValue([]);
		await take();
		expect(mocks.takeInPage).not.toHaveBeenCalled();
		expect(mocks.finishPage).toHaveBeenCalledWith({
			of: task,
			result: { problem: { reason: 'otherCode' }, ignored: undefined }
		});
	});

	test('records what there is to tell, and a page without a code as ignored', async () => {
		mocks.takeInPage.mockResolvedValue('differs');
		await take();
		expect(mocks.finishPage.mock.lastCall?.[0].result.problem).toEqual({
			reason: 'differs',
			conferenceId: 'conf'
		});
		mocks.read.mockResolvedValue({ page: 1, blank: false, codes: [] });
		await take();
		expect(mocks.finishPage.mock.lastCall?.[0].result).toEqual({
			problem: undefined,
			ignored: 'noCode'
		});
	});

	test('throws what is no fault of the page, so it is tried again', async () => {
		mocks.readStoredFile.mockResolvedValueOnce(null);
		await expect(take()).rejects.toThrow('no such page');
		mocks.read.mockRejectedValueOnce(new Error('The process ended'));
		await expect(take()).rejects.toThrow('The process ended');
		mocks.takeInPage.mockRejectedValueOnce(new Error('database is down'));
		await expect(take()).rejects.toThrow('database is down');
		expect(mocks.finishPage).not.toHaveBeenCalled();
	});
});
