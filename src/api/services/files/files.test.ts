import { afterEach, describe, expect, test, vi } from 'vitest';
import { findFileSource, formatMegabytes } from './files';
import { contentDisposition, createStorage, filePurpose, objectKey } from './storageClient';

describe('findFileSource', () => {
	test('maps a route to its column, purpose, limits and caching', () => {
		expect(findFileSource('conference', 'logo')).toMatchObject({
			kind: 'conference',
			field: 'logo',
			purpose: 'conference/logo',
			column: 'logoFileId',
			roles: ['PROJECT_MANAGEMENT']
		});
		expect(findFileSource('conference', 'certificate')).toMatchObject({
			mimeTypes: ['application/pdf']
		});
		expect(findFileSource('resolution', 'content')?.column).toBe('fileId');
	});

	test('lets the content roles upload templates, but only project management the pictures', () => {
		expect(findFileSource('conference', 'contract')?.roles).toContain('CONTENT_LEAD');
		expect(findFileSource('conference', 'emblem')?.roles).not.toContain('CONTENT_LEAD');
	});

	test('does not serve anything that is not listed', () => {
		expect(findFileSource('user', 'avatar')).toBeUndefined();
		expect(findFileSource('conference', 'iban')).toBeUndefined();
		expect(findFileSource('conference', 'constructor')).toBeUndefined();
		expect(findFileSource('constructor', 'logo')).toBeUndefined();
	});
});

describe('formatMegabytes', () => {
	test('rounds to a tenth', () => {
		expect(formatMegabytes(10_000_000)).toBe('10 MB');
		expect(formatMegabytes(1_250_000)).toBe('1.3 MB');
	});
});

describe('objectKey', () => {
	test('groups objects by conference and purpose', () => {
		expect(objectKey('c1', filePurpose('conference', 'logo'), 'f1')).toBe(
			'conferences/c1/conference/logo/f1'
		);
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
		const first = await storage.presignDownload('conferences/c1/conference/logo/f1');
		vi.setSystemTime(new Date('2026-10-14T15:00:00Z'));
		expect(await storage.presignDownload('conferences/c1/conference/logo/f1')).toBe(first);

		vi.setSystemTime(new Date('2026-10-14T16:00:01Z'));
		expect(await storage.presignDownload('conferences/c1/conference/logo/f1')).not.toBe(first);
	});

	test('names the file when asked', async () => {
		const url = new URL(await storage.presignDownload('k', 'Résolution 1.pdf'));
		expect(url.searchParams.get('response-content-disposition')).toBe(
			contentDisposition('Résolution 1.pdf')
		);
	});
});
