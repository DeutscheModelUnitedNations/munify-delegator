import { describe, expect, test } from 'vitest';
import { nationCodesMatching } from './nationTranslationHelper.svelte';

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
