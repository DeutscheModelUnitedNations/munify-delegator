import { describe, expect, test } from 'vitest';
import {
	brandOfSeries,
	escapeTypstString,
	escapeTypstText,
	typstFactBox,
	typstLang,
	typstPreamble
} from './typstTemplate';

describe('brandOfSeries', () => {
	test('recognises the conference series however they are written', () => {
		expect(brandOfSeries('MUN-SH')).toBe('mun-sh');
		expect(brandOfSeries('mun sh')).toBe('mun-sh');
		expect(brandOfSeries('MUNBW')).toBe('munbw');
		expect(brandOfSeries('MUN-BW')).toBe('munbw');
	});

	test('prints anything else as DMUN', () => {
		expect(brandOfSeries('MUNOL')).toBe('dmun');
		expect(brandOfSeries(null)).toBe('dmun');
		expect(brandOfSeries(undefined)).toBe('dmun');
	});
});

describe('typstLang', () => {
	test('turns known ISO 639-3 codes into their two-letter form', () => {
		expect(typstLang('deu')).toBe('de');
		expect(typstLang('eng')).toBe('en');
	});

	test('keeps other codes and falls back to German', () => {
		expect(typstLang('swa')).toBe('swa');
		expect(typstLang('Deutsch')).toBe('de');
		expect(typstLang(null)).toBe('de');
	});
});

describe('escaping', () => {
	test('escapes every character that starts markup', () => {
		expect(escapeTypstText('#$*_`<>@~[]=/+-\\')).toBe(
			'\\#\\$\\*\\_\\`\\<\\>\\@\\~\\[\\]\\=\\/\\+\\-\\\\'
		);
		expect(escapeTypstText('Kenia „Nairobi“')).toBe('Kenia „Nairobi“');
	});

	test('escapes quotes and backslashes in strings', () => {
		expect(escapeTypstString('a"b\\c')).toBe('a\\"b\\\\c');
	});
});

test('typstPreamble sets the brand accent and language', () => {
	const source = typstPreamble({ brand: 'munbw', lang: 'en' });
	expect(source).toContain('#let dmun-accent = rgb("#DC770A")');
	expect(source).toContain('font: ("Outfit", "DejaVu Sans")');
	expect(source).toContain('lang: "en"');
});

describe('typstFactBox', () => {
	test('is empty without facts', () => {
		expect(typstFactBox([])).toBe('');
	});

	test('escapes labels and values', () => {
		expect(typstFactBox([{ label: 'Thema', value: '#1' }])).toContain(
			'[Thema] #linebreak() #text(size: 9.5pt)[\\#1]'
		);
	});
});
