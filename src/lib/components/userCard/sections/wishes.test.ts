import { describe, expect, it } from 'vitest';
import { delegationWishes } from './wishes';

const nation = (id: string, rank: number, alpha3Code: string, alpha2Code: string) => ({
	id,
	rank,
	role: {
		kind: 'NATION' as const,
		name: null,
		fontAwesomeIcon: null,
		nation: { alpha2Code, alpha3Code }
	}
});

const countryName = (alpha3Code: string) => `country ${alpha3Code}`;

describe('delegationWishes', () => {
	it('lists the wishes by their rank', () => {
		const wishes = delegationWishes(
			[nation('b', 2, 'FRA', 'fr'), nation('a', 1, 'DEU', 'de')],
			countryName
		);
		expect(wishes.map((wish) => wish.id)).toEqual(['a', 'b']);
	});

	it('names a nation by its country and shows its flag', () => {
		expect(delegationWishes([nation('a', 1, 'DEU', 'de')], countryName)).toEqual([
			{ id: 'a', label: 'country DEU', alpha2Code: 'de' }
		]);
	});

	it('names a non-state actor by its name and shows its icon', () => {
		const actor = {
			id: 'n',
			rank: 1,
			role: {
				kind: 'NON_STATE_ACTOR' as const,
				name: 'Red Cross',
				fontAwesomeIcon: 'fa-cross',
				nation: null
			}
		};
		expect(delegationWishes([actor], countryName)).toEqual([
			{ id: 'n', label: 'Red Cross', icon: 'fa-cross' }
		]);
	});
});
