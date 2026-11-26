// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { contentKeyOf, cutName, hashOf, pageKeyOf, scanFileType } from './scanFile';

const bytes = (...parts: (string | number)[]) =>
	Uint8Array.from(
		parts.flatMap((part) =>
			typeof part === 'number' ? [part] : [...part].map((char) => char.charCodeAt(0))
		)
	);

describe('scanFileType', () => {
	test('tells by the first bytes, whatever a scanner calls it', () => {
		expect(scanFileType(bytes('%PDF-1.7'))).toBe('application/pdf');
		expect(scanFileType(bytes('\r\n\r\n%PDF-1.4'))).toBe('application/pdf');
		expect(scanFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
		expect(scanFileType(bytes(0x89, 'PNG'))).toBe('image/png');
		expect(scanFileType(bytes('RIFF', 1, 2, 3, 4, 'WEBP'))).toBe('image/webp');
	});

	test('knows no TIFF, text or nothing', () => {
		expect(scanFileType(bytes('II*', 0))).toBeUndefined();
		expect(scanFileType(bytes('hello'))).toBeUndefined();
		expect(scanFileType(bytes())).toBeUndefined();
	});
});

describe('contentKeyOf', () => {
	test('names a page of a file', async () => {
		const hash = await hashOf(bytes('abc'));
		expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
		expect(contentKeyOf({ hash, page: 2 })).toBe(`${hash}:2`);
	});
});

describe('pageKeyOf', () => {
	const fields = ['termsSignature'];

	test('names a page by its code, whatever file it is in', async () => {
		const key = await pageKeyOf({ code: 'ADA', fields, contentKey: 'a:1' });
		expect(key).toMatch(/^code:[0-9a-f]{64}$/);
		expect(await pageKeyOf({ code: 'ADA', fields, contentKey: 'b:7' })).toBe(key);
		expect(await pageKeyOf({ code: 'BOB', fields, contentKey: 'a:1' })).not.toBe(key);
	});

	test('names one without a code, or without fields, by its file', async () => {
		expect(await pageKeyOf({ code: null, fields, contentKey: 'a:1' })).toBe('file:a:1');
		// the pages of a print without fields share their code
		expect(await pageKeyOf({ code: 'ADA', fields: [], contentKey: 'a:2' })).toBe('file:a:2');
	});
});

describe('cutName', () => {
	test('says which page of the stack it is', () => {
		const args = { name: 'Scan 2026.PDF', type: 'application/pdf' as const };
		expect(cutName({ ...args, page: 4 })).toBe('Scan 2026_4.pdf');
		expect(cutName({ name: '', type: 'image/jpeg', page: 1 })).toBe('scan.jpg');
	});
});
