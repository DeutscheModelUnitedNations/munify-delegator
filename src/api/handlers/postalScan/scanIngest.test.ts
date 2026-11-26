import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_POSTAL_SCAN_SIZE, MAX_SCAN_FILE_SIZE } from '#lib/paperScan/limits';
import { IntakeBusyError } from './intakeGate';
import { ingestScan, NotAllowedToDeliverError, ScanRefusedError } from './scanIngest';

const mocks = vi.hoisted(() => ({
	currentDeliverer: vi.fn(),
	mayDeliver: vi.fn(),
	noteDelivery: vi.fn(),
	countDeliveries: vi.fn(),
	queueDelivery: vi.fn(),
	wakeScanQueue: vi.fn(),
	storeStream: vi.fn(),
	deleteObject: vi.fn()
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessService', () => mocks);
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => mocks);
vi.mock('#api/handlers/storedFile/storedFileService', () => mocks);
vi.mock('#api/handlers/storedFile/storageClient', () => ({
	filePurpose: () => 'scanDelivery/scan'
}));
vi.mock('./scanTaskService', () => mocks);
vi.mock('./scanQueue', () => mocks);

const deliverer = {
	accessId: 'access',
	accessName: 'Copier',
	userId: 'ada',
	expiresAt: new Date()
};
const PDF = new TextEncoder().encode('%PDF-1.7 a stack');

async function* bodyOf(...chunks: Uint8Array[]) {
	yield* chunks;
}
const deliver = (body: AsyncIterable<Uint8Array> = bodyOf(PDF)) => {
	const open = vi.fn(() => ({ name: 'a.pdf', body }));
	return { open, delivered: ingestScan({ deliverer, open }) };
};

/** What was stored, all of it. */
let stored: number[] = [];

beforeEach(() => {
	vi.resetAllMocks();
	stored = [];
	mocks.currentDeliverer.mockResolvedValue(deliverer);
	mocks.mayDeliver.mockResolvedValue(true);
	mocks.countDeliveries.mockResolvedValue({ files: 0, bytes: 0 });
	mocks.queueDelivery.mockResolvedValue(undefined);
	mocks.noteDelivery.mockResolvedValue(undefined);
	mocks.deleteObject.mockResolvedValue(undefined);
	mocks.storeStream.mockImplementation(async ({ body }) => {
		let size = 0;
		for await (const chunk of body) {
			size += chunk.length;
			if (size < 10_000) stored.push(...chunk);
		}
		return { key: 'users/ada/x', size };
	});
});

describe('ingestScan', () => {
	test('stores what comes in, all of it, queues it and has it taken in', async () => {
		const chunks = [PDF.slice(0, 3), PDF.slice(3, 4), PDF.slice(4)];
		await deliver(bodyOf(...chunks)).delivered;
		expect(stored).toEqual([...PDF]);
		expect(mocks.storeStream.mock.calls[0][0]).toMatchObject({
			userId: 'ada',
			mimeType: 'application/pdf'
		});
		expect(mocks.queueDelivery).toHaveBeenCalledExactlyOnceWith({
			deliverer,
			file: { name: 'a.pdf', key: 'users/ada/x', size: PDF.length }
		});
		expect(mocks.wakeScanQueue).toHaveBeenCalledOnce();
		expect(mocks.noteDelivery).toHaveBeenCalledWith('access');
	});

	test('takes an empty file for a trial, and refuses what is no scan, unstored', async () => {
		await deliver(bodyOf()).delivered;
		const text = deliver(bodyOf(new TextEncoder().encode('II* a TIFF'))).delivered;
		await expect(text).rejects.toMatchObject({ status: 415 });
		expect(mocks.storeStream).not.toHaveBeenCalled();
	});

	test('refuses what grows too large: a stack by gigabytes, a picture as a page', async () => {
		const large = { length: MAX_POSTAL_SCAN_SIZE + 1 };
		// TYPE-SAFETY-EXCEPTION: only how long it is counts here
		const chunk = large as unknown as Uint8Array;
		const picture = new Uint8Array(2000).fill(1);
		picture.set([0xff, 0xd8, 0xff]);
		await expect(deliver(bodyOf(picture, chunk)).delivered).rejects.toMatchObject({ status: 413 });
		const padded = new Uint8Array(2000);
		padded.set(PDF);
		const huge = { length: MAX_SCAN_FILE_SIZE } as unknown as Uint8Array;
		await expect(deliver(bodyOf(padded, huge)).delivered).rejects.toBeInstanceOf(ScanRefusedError);
		expect(mocks.queueDelivery).not.toHaveBeenCalled();
	});

	test('reads nothing of a login removed or not allowed since it signed in', async () => {
		mocks.currentDeliverer.mockResolvedValueOnce(undefined);
		const removed = deliver();
		await expect(removed.delivered).rejects.toBeInstanceOf(NotAllowedToDeliverError);
		mocks.mayDeliver.mockResolvedValueOnce(false);
		const forbidden = deliver();
		await expect(forbidden.delivered).rejects.toBeInstanceOf(NotAllowedToDeliverError);
		expect(removed.open).not.toHaveBeenCalled();
		expect(forbidden.open).not.toHaveBeenCalled();
	});

	test('keeps nothing of a login removed while its file was sent', async () => {
		mocks.mayDeliver.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		await expect(deliver().delivered).rejects.toBeInstanceOf(NotAllowedToDeliverError);
		expect(mocks.queueDelivery).not.toHaveBeenCalled();
		expect(mocks.deleteObject).toHaveBeenCalledWith('users/ada/x');
	});

	test.each([
		{ files: 500, bytes: 0 },
		{ files: 1, bytes: 5 * MAX_SCAN_FILE_SIZE }
	])('turns a delivery away, unread, while too much waits (%o)', async (waiting) => {
		mocks.countDeliveries.mockResolvedValue(waiting);
		const { open, delivered } = deliver();
		await expect(delivered).rejects.toBeInstanceOf(IntakeBusyError);
		expect(open).not.toHaveBeenCalled();
	});

	test('does not say a delivery arrived that could not be queued, but one that was', async () => {
		mocks.queueDelivery.mockRejectedValueOnce(new Error('database is down'));
		await expect(deliver().delivered).rejects.toThrow('database is down');
		expect(mocks.deleteObject).toHaveBeenCalledOnce();
		mocks.noteDelivery.mockRejectedValueOnce(new Error('Redis is down'));
		await expect(deliver().delivered).resolves.toBeUndefined();
	});
});
