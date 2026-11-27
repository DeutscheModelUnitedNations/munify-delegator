import { describe, expect, test } from 'vitest';
import { callingCodeOf, countryFactsOf } from './countryFacts';

describe('countryFactsOf', () => {
	test('reads a country by alpha-3 code in any case', () => {
		const kenya = countryFactsOf('ken');
		expect(kenya).toMatchObject({
			alpha2Code: 'KE',
			alpha3Code: 'KEN',
			numericCode: '404',
			capitals: ['Nairobi'],
			region: 'Africa',
			subregion: 'Eastern Africa',
			landlocked: false,
			borders: ['ETH', 'SOM', 'SSD', 'TZA', 'UGA'],
			currencies: [{ code: 'KES', name: 'Kenyan shilling', symbol: 'Sh' }],
			callingCode: '+254',
			topLevelDomains: ['.ke'],
			demonym: 'Kenyan'
		});
		expect(kenya?.languages).toEqual([
			{ code: 'eng', name: 'English' },
			{ code: 'swa', name: 'Swahili' }
		]);
	});

	test('has no neighbours for an island state', () => {
		expect(countryFactsOf('ISL')?.borders).toEqual([]);
	});

	test('answers nothing for an unknown code', () => {
		expect(countryFactsOf('XXX')).toBeUndefined();
	});
});

describe('callingCodeOf', () => {
	test.each([
		[{ root: '+2', suffixes: ['54'] }, '+254'],
		[{ root: '+1', suffixes: ['201', '202', '203', '204'] }, '+1'],
		[{ root: '+1', suffixes: ['809', '829', '849'] }, '+1'],
		[{ root: '+7', suffixes: ['6', '7'] }, '+7'],
		[{ root: '+7', suffixes: [] }, '+7'],
		[{ root: '', suffixes: [] }, undefined]
	])('%j reads %j', (idd, expected) => {
		expect(callingCodeOf(idd)).toEqual(expected);
	});
});
