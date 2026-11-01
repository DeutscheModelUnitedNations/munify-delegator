import { describe, expect, it } from 'vitest';
import { sameSitePath } from './sameSitePath';

const ORIGIN = 'https://delegator.example';

describe('sameSitePath', () => {
	it('keeps a path on this site, with its query and hash', () => {
		expect(sameSitePath({ path: '/dashboard/abc?tab=1#top', origin: ORIGIN })).toBe(
			'/dashboard/abc?tab=1#top'
		);
	});

	it('falls back when nothing is given', () => {
		expect(sameSitePath({ path: undefined, origin: ORIGIN })).toBe('/');
		expect(sameSitePath({ path: '', origin: ORIGIN, fallback: '/dashboard' })).toBe('/dashboard');
	});

	it('refuses what navigates to another origin', () => {
		for (const path of [
			'https://evil.example/',
			'//evil.example',
			'/\\evil.example',
			'/\\\\evil.example/x',
			'\\\\evil.example',
			'javascript:alert(1)'
		]) {
			expect(sameSitePath({ path, origin: ORIGIN }), path).toBe('/');
		}
	});

	it('keeps a percent-encoded backslash, which stays a path', () => {
		expect(sameSitePath({ path: '/%5Cevil.example', origin: ORIGIN })).toBe('/%5Cevil.example');
	});
});
