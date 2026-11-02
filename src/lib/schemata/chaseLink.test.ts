import { describe, expect, it } from 'vitest';
import { chaseUrlSchema, isLinkableUrl } from './chaseLink';

describe('isLinkableUrl', () => {
	it('takes https addresses', () => {
		expect(isLinkableUrl('https://chase.dmun.de')).toBe(true);
	});

	it('takes http only on this machine', () => {
		expect(isLinkableUrl('http://localhost:5174')).toBe(true);
		expect(isLinkableUrl('http://127.0.0.1:5174')).toBe(true);
		expect(isLinkableUrl('http://chase.dmun.de')).toBe(false);
	});

	it('refuses what is not a web address', () => {
		expect(isLinkableUrl('chase.dmun.de')).toBe(false);
		expect(isLinkableUrl('ftp://chase.dmun.de')).toBe(false);
		expect(isLinkableUrl('')).toBe(false);
	});
});

describe('chaseUrlSchema', () => {
	it('keeps only the origin', () => {
		expect(chaseUrlSchema.parse('  https://chase.dmun.de/app/launcher?x=1 ')).toBe(
			'https://chase.dmun.de'
		);
	});
});
