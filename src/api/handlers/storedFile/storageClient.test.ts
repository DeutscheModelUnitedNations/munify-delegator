import { afterEach, describe, expect, test, vi } from 'vitest';
import { contentDisposition, createStorage, filePurpose, objectKey } from './storageClient';

describe('objectKey', () => {
	test('groups objects by conference and purpose', () => {
		expect(
			objectKey({
				conferenceId: 'c1',
				purpose: filePurpose({ kind: 'conference', field: 'logo' }),
				uniqueId: 'f1'
			})
		).toBe('conferences/c1/conference/logo/f1');
	});
});

describe('contentDisposition', () => {
	test('keeps a plain name', () => {
		expect(contentDisposition('Resolution 1.pdf')).toBe(
			`inline; filename="Resolution 1.pdf"; filename*=UTF-8''Resolution%201.pdf`
		);
	});

	test('names the file in full as UTF-8, with an ASCII fallback', () => {
		expect(contentDisposition("Rés (1)'s *final*!.pdf")).toBe(
			`inline; filename="Res _1__s _final__.pdf"; filename*=UTF-8''R%C3%A9s%20%281%29%27s%20%2Afinal%2A%21.pdf`
		);
	});
});

describe('presignDownload', () => {
	const storage = createStorage({
		endpoint: 'http://s3.test/bucket',
		accessKeyId: 'key',
		secretAccessKey: 'secret',
		region: 'us-east-1'
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('hands out the same URL for hours, so browsers can cache the file', async () => {
		vi.useFakeTimers({ now: new Date('2026-10-14T10:00:00Z') });
		const first = await storage.presignDownload({ key: 'conferences/c1/conference/logo/f1' });
		vi.setSystemTime(new Date('2026-10-14T15:00:00Z'));
		expect(await storage.presignDownload({ key: 'conferences/c1/conference/logo/f1' })).toBe(first);

		vi.setSystemTime(new Date('2026-10-14T16:00:01Z'));
		expect(await storage.presignDownload({ key: 'conferences/c1/conference/logo/f1' })).not.toBe(
			first
		);
	});

	test('names the file when asked', async () => {
		const url = new URL(await storage.presignDownload({ key: 'k', fileName: 'Résolution 1.pdf' }));
		expect(url.searchParams.get('response-content-disposition')).toBe(
			contentDisposition('Résolution 1.pdf')
		);
	});
});
