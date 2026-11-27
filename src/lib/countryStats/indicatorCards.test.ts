import { describe, expect, test } from 'vitest';
import { COUNTRY_INDICATOR_CODES } from './indicators';
import { indicatorCards } from './indicatorCards';

describe('indicatorCards', () => {
	test('has a card per indicator in display order, even without figures', () => {
		const cards = indicatorCards({ figures: [], locale: 'de' });
		expect(cards.map(({ code }) => code)).toEqual(COUNTRY_INDICATOR_CODES);
		expect(cards[0]).toMatchObject({ value: '–', desc: 'Keine Daten der World Bank' });
	});

	test('formats a value and names its year', () => {
		const [population] = indicatorCards({
			figures: [{ indicator: 'SP.POP.TOTL', value: 55_100_000, year: 2023 }],
			locale: 'de'
		});
		expect(population).toMatchObject({
			title: 'Bevölkerung',
			value: '55,1\u00a0Mio.',
			desc: 'Einwohnerzahl · Stand 2023'
		});
	});

	test('leaves out an unknown year', () => {
		const [population] = indicatorCards({
			figures: [{ indicator: 'SP.POP.TOTL', value: 1, year: null }],
			locale: 'de'
		});
		expect(population?.desc).toBe('Einwohnerzahl');
	});
});
