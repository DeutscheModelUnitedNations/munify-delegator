import { describe, expect, it } from 'vitest';
import { sameSitePath } from './sameSitePath';

const ORIGIN = 'https://delegator.example';

describe('sameSitePath', () => {
	it('keeps a path on this site, with its query and hash', () => {
		expect(sameSitePath('/dashboard/abc?tab=1#top', ORIGIN)).toBe('/dashboard/abc?tab=1#top');
	});

	it('falls back when nothing is given', () => {
		expect(sameSitePath(undefined, ORIGIN)).toBe('/');
		expect(sameSitePath('', ORIGIN, '/dashboard')).toBe('/dashboard');
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
			expect(sameSitePath(path, ORIGIN), path).toBe('/');
		}
	});

	it('keeps a percent-encoded backslash, which stays a path', () => {
		expect(sameSitePath('/%5Cevil.example', ORIGIN)).toBe('/%5Cevil.example');
	});
});
