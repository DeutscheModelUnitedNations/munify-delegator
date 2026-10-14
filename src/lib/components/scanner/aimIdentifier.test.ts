import { describe, expect, test } from 'vitest';
import { readAimIdentifier } from './aimIdentifier';

describe('readAimIdentifier', () => {
	test('names a QR code and strips the identifier', () => {
		expect(readAimIdentifier(']Q1MUN1.abc')).toEqual({ code: 'MUN1.abc', format: 'qr_code' });
	});

	test('names a barcode', () => {
		expect(readAimIdentifier(']C0user-id-12345')).toEqual({
			code: 'user-id-12345',
			format: 'code_128'
		});
	});

	test('an unknown symbology is still a scan', () => {
		expect(readAimIdentifier(']Z0text')).toEqual({ code: 'text', format: 'unknown' });
	});

	test('text without an identifier has no format', () => {
		expect(readAimIdentifier('CARD-0003')).toEqual({ code: 'CARD-0003', format: null });
	});
});
