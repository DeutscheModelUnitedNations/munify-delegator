import { beforeEach, describe, expect, test, vi } from 'vitest';
import { takeInPage } from './takeInPage';

const { findPostalScan, keepPostalScan, applyPaperReadings } = vi.hoisted(() => ({
	findPostalScan: vi.fn(),
	keepPostalScan: vi.fn(),
	applyPaperReadings: vi.fn()
}));
vi.mock('./postalScanService', () => ({ findPostalScan, keepPostalScan }));
vi.mock('#api/handlers/agreementDetail/agreementDetailService', () => ({ applyPaperReadings }));

const storeFile = vi.fn<() => Promise<string | undefined>>();
const signed = { field: 'termsSignature', state: 'yes' } as const;
const take = (readings: Parameters<typeof takeInPage>[0]['readings']) =>
	takeInPage({
		participantId: 'ada',
		source: 'WEBDAV',
		uploadedById: 'care',
		page: { pageKey: 'code:1', fields: ['termsSignature'] },
		readings,
		storeFile
	});

beforeEach(() => {
	vi.clearAllMocks();
	findPostalScan.mockResolvedValue(undefined);
	keepPostalScan.mockResolvedValue('stored');
	storeFile.mockResolvedValue('file');
});

describe('takeInPage', () => {
	test('keeps a new page, with only what is printed on it', async () => {
		expect(await take([signed, { field: 'mediaPhoto', state: 'yes' }])).toBe('stored');
		expect(keepPostalScan).toHaveBeenCalledWith(
			expect.objectContaining({ fileId: 'file', readings: [signed] })
		);
		expect(applyPaperReadings).toHaveBeenCalledWith({
			participantId: 'ada',
			readings: [signed],
			confirm: false
		});
	});

	test('stores nothing of a page kept already, but takes in what it says', async () => {
		findPostalScan.mockResolvedValue({ id: 'scan', readings: [signed] });
		expect(await take([signed])).toBe('known');
		expect(storeFile).not.toHaveBeenCalled();
		expect(applyPaperReadings).toHaveBeenCalledOnce();
	});

	test('answers what was decided under the lock, when another delivery came first', async () => {
		keepPostalScan.mockResolvedValue('known');
		expect(await take([signed])).toBe('known');
	});

	test('changes nothing of a page whose file is not there yet', async () => {
		storeFile.mockResolvedValue(undefined);
		expect(await take([signed])).toBeNull();
		expect(keepPostalScan).not.toHaveBeenCalled();
		expect(applyPaperReadings).not.toHaveBeenCalled();
	});
});
