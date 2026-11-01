import { describe, expect, test } from 'vitest';
import { safeImageUrl, safeLinkUrl } from './safeUrl';

describe('safeLinkUrl', () => {
	test.each([
		'https://dmun.de/programm',
		'http://example.org',
		'mailto:info@dmun.de',
		'tel:+4930123456',
		'/dashboard',
		'#programm',
		'programm.pdf'
	])('keeps %s', (url) => {
		expect(safeLinkUrl(url)).toBe(url);
	});

	test.each([
		'javascript:alert(1)',
		' JavaScript:alert(1)',
		'java\tscript:alert(1)',
		'java\nscript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		''
	])('refuses %j', (url) => {
		expect(safeLinkUrl(url)).toBeUndefined();
	});
});

describe('safeImageUrl', () => {
	test('keeps web addresses and relative ones', () => {
		expect(safeImageUrl('https://cdn.dmun.de/logo.png')).toBe('https://cdn.dmun.de/logo.png');
		expect(safeImageUrl('/logo.png')).toBe('/logo.png');
	});

	test('refuses everything else', () => {
		expect(safeImageUrl('javascript:alert(1)')).toBeUndefined();
		expect(safeImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeUndefined();
		expect(safeImageUrl('mailto:info@dmun.de')).toBeUndefined();
	});
});
