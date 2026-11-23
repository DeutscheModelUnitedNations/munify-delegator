import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ingestScans, NotAllowedToDeliverError } from './scanIngest';

const mocks = vi.hoisted(() => ({
	currentDeliverer: vi.fn(),
	mayDeliver: vi.fn(),
	noteDelivery: vi.fn(),
	takeScan: vi.fn(),
	tellScanProblems: vi.fn()
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessService', () => ({
	currentDeliverer: mocks.currentDeliverer,
	noteDelivery: mocks.noteDelivery
}));
vi.mock('#api/handlers/scannerAccess/scannerAccessPermissions', () => ({
	mayDeliver: mocks.mayDeliver
}));
vi.mock('#lib/paperScan/intake/takeScan', () => ({ takeScan: mocks.takeScan }));
vi.mock('./scanProblemNotice', () => ({ tellScanProblems: mocks.tellScanProblems }));
vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('./scanReader', () => ({ readScan: vi.fn() }));
vi.mock('./takeInPage', () => ({ takeInPage: vi.fn() }));
vi.mock('#api/handlers/signedCode/signedCodeService', () => ({ verifyCode: vi.fn() }));
vi.mock('#api/handlers/storedFile/storageClient', () => ({ filePurpose: vi.fn() }));
vi.mock('#api/handlers/storedFile/storedFileService', () => ({ storeGeneratedFile: vi.fn() }));

const deliverer = {
	accessId: 'access',
	accessName: 'Copier',
	teamMemberId: 'member',
	userId: 'ada',
	conferenceId: 'conf',
	role: 'PARTICIPANT_CARE',
	expiresAt: new Date()
};
const receive = vi.fn(async () => [{ name: 'a.pdf', bytes: new Uint8Array() }]);
const deliver = () => ingestScans({ deliverer, receive, source: 'EMAIL' });

beforeEach(() => {
	vi.clearAllMocks();
	mocks.currentDeliverer.mockResolvedValue(deliverer);
	mocks.mayDeliver.mockResolvedValue(true);
	mocks.takeScan.mockResolvedValue({ people: [], problems: [] });
});

describe('ingestScans', () => {
	test('takes in each file and notes the delivery', async () => {
		await deliver();
		expect(mocks.takeScan).toHaveBeenCalledWith(
			expect.objectContaining({
				conferenceId: 'conf',
				file: expect.objectContaining({ name: 'a.pdf' })
			})
		);
		expect(mocks.noteDelivery).toHaveBeenCalledWith('access');
		expect(mocks.tellScanProblems).not.toHaveBeenCalled();
	});

	test('reads nothing of a login removed or not allowed since it signed in', async () => {
		mocks.currentDeliverer.mockResolvedValueOnce(undefined);
		await expect(deliver()).rejects.toBeInstanceOf(NotAllowedToDeliverError);
		mocks.mayDeliver.mockResolvedValueOnce(false);
		await expect(deliver()).rejects.toBeInstanceOf(NotAllowedToDeliverError);
		expect(receive).not.toHaveBeenCalled();
	});

	test('keeps nothing of a login removed while its file was sent', async () => {
		mocks.mayDeliver.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		await expect(deliver()).rejects.toBeInstanceOf(NotAllowedToDeliverError);
		expect(receive).toHaveBeenCalledOnce();
		expect(mocks.takeScan).not.toHaveBeenCalled();
	});

	test('tells its owner of what came to nothing', async () => {
		const problems = [{ file: 'a.pdf', pages: [1], reason: 'noCode' }];
		mocks.takeScan.mockResolvedValue({ people: [], problems });
		await deliver();
		expect(mocks.tellScanProblems).toHaveBeenCalledWith({ problems, deliverer });
	});
});
