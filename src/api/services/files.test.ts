import { describe, expect, test } from 'vitest';
import {
	decodeDataURL,
	fileFromRow,
	fileHeaders,
	fileQuery,
	findFileSource,
	isValidFileId,
	storedFileUrl
} from './files';

describe('decodeDataURL', () => {
	test('decodes base64 payloads to bytes and keeps the mime type', () => {
		const decoded = decodeDataURL('data:application/pdf;base64,JVBERg==');
		expect(decoded?.mimeType).toBe('application/pdf');
		expect(Array.from(decoded?.bytes ?? [])).toEqual([0x25, 0x50, 0x44, 0x46]);
	});

	test('decodes url-encoded payloads', () => {
		const decoded = decodeDataURL('data:image/svg+xml,%3Csvg%2F%3E');
		expect(decoded?.mimeType).toBe('image/svg+xml');
		expect(new TextDecoder().decode(decoded?.bytes)).toBe('<svg/>');
	});

	test('rejects anything that is not a data URL', () => {
		expect(decodeDataURL('https://example.com/a.png')).toBeUndefined();
	});
});

describe('findFileSource', () => {
	test('maps a route to its column and caching', () => {
		expect(findFileSource('conference', 'logo')).toEqual({
			kind: 'conference',
			column: 'logoDataURL',
			cacheable: true
		});
		expect(findFileSource('conference', 'certificate')?.cacheable).toBe(false);
	});

	test('does not serve anything that is not listed', () => {
		expect(findFileSource('user', 'avatar')).toBeUndefined();
		expect(findFileSource('conference', 'iban')).toBeUndefined();
		expect(findFileSource('conference', 'constructor')).toBeUndefined();
		expect(findFileSource('constructor', 'logo')).toBeUndefined();
	});
});

describe('storedFileUrl', () => {
	const row = { id: 'abc', updatedAt: new Date(1000) };

	test('is versioned by the row update time', () => {
		expect(storedFileUrl('place', row, 'sitePlan', 'data:image/png;base64,')).toBe(
			'/files/place/abc/sitePlan?v=1000'
		);
	});

	test('is null when nothing is stored', () => {
		expect(storedFileUrl('place', row, 'sitePlan', null)).toBeNull();
	});
});

describe('isValidFileId', () => {
	test('accepts ids and rejects anything else', () => {
		expect(isValidFileId('seed-conference_1')).toBe(true);
		expect(isValidFileId('a"}) { x')).toBe(false);
		expect(isValidFileId('')).toBe(false);
	});
});

describe('fileFromRow', () => {
	test('finds the stored file and the file name', () => {
		const file = fileFromRow(
			{ content: 'data:application/pdf;base64,JVBERg==', fileName: 'a.pdf' },
			'content'
		);
		expect(file).toMatchObject({ status: 'found', mimeType: 'application/pdf', fileName: 'a.pdf' });
	});

	test('reports a row without the file as missing', () => {
		expect(fileFromRow(null, 'content')).toEqual({ status: 'missing' });
		expect(fileFromRow({ content: null }, 'content')).toEqual({ status: 'missing' });
		expect(fileFromRow({ content: 'not a data url' }, 'content')).toEqual({ status: 'missing' });
	});
});

describe('fileHeaders', () => {
	test('lets public images be cached for good', () => {
		const headers = fileHeaders({ mimeType: 'image/png' }, true, '"x"');
		expect(headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
		expect(headers.get('content-disposition')).toBeNull();
	});

	test('keeps private files per user and names downloads', () => {
		const headers = fileHeaders(
			{ mimeType: 'application/pdf', fileName: 'Rés 1.pdf' },
			false,
			'"x"'
		);
		expect(headers.get('cache-control')).toBe('private, no-cache');
		expect(headers.get('content-disposition')).toBe("inline; filename*=UTF-8''R%C3%A9s%201.pdf");
	});
});

describe('fileQuery', () => {
	test('selects the file, and a resolution also its name', () => {
		expect(fileQuery('conference', 'logoDataURL')).toContain('conference(id: $id) { logoDataURL }');
		expect(fileQuery('resolution', 'content')).toContain('{ content fileName }');
	});
});
