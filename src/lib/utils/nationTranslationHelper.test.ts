import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/paraglide/runtime', () => ({ locales: ['de', 'en'], getLocale: () => 'de' }));

const { getFullTranslatedCountryNameFromISO3Code, nationCodesMatching } =
	await import('./nationTranslationHelper.svelte');

describe('getFullTranslatedCountryNameFromISO3Code', () => {
	test('uses the corrected German name of Eswatini, not "Swasiland"', () => {
		expect(getFullTranslatedCountryNameFromISO3Code('swz')).toBe('Eswatini');
	});
});

describe('nationCodesMatching', () => {
	test('finds a nation by its code, ignoring case and surrounding space', () => {
		expect(nationCodesMatching('  deu ')).toContain('DEU');
	});

	test('finds a nation by its name in any language', () => {
		expect(nationCodesMatching('Deutschland')).toContain('DEU');
		expect(nationCodesMatching('germany')).toContain('DEU');
	});

	test('matches nothing for a blank term or a term no nation contains', () => {
		expect(nationCodesMatching('   ')).toEqual([]);
		expect(nationCodesMatching('qqxqq')).toEqual([]);
	});
});
