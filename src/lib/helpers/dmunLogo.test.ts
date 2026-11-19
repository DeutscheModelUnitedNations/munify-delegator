import { describe, expect, it } from 'vitest';
import { dmunLogoUrl } from './dmunLogo';

describe('dmunLogoUrl', () => {
	it('points at the logos folder of the DMUN CDN', () => {
		expect(dmunLogoUrl('mun-sh.svg')).toBe('https://cdn.dmun.de/cdn/logos/mun-sh.svg');
	});
});
