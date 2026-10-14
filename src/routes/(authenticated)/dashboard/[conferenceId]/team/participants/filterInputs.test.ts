import { describe, expect, test, vi } from 'vitest';

vi.mock('$lib/utils/nationTranslationHelper.svelte', () => ({
	nationCodesMatching: (term: string) => (term === 'Deu' ? ['DEU'] : [])
}));

const { toFilterInputs } = await import('./filterInputs');
type Kinds = Parameters<typeof toFilterInputs>[1];

const kinds: Kinds = new Map([
	['city', 'text'],
	['nation', 'text'],
	['gender', 'enum'],
	['accepted', 'boolean'],
	['age', 'range']
]);

const inputsOf = (id: string, value: unknown) => toFilterInputs([{ id, value }], kinds);

describe('toFilterInputs', () => {
	test('text', () => {
		expect(inputsOf('city', { mode: 'equals', value: 'Bonn' })).toEqual([
			{ column: 'city', mode: 'equals', text: 'Bonn' }
		]);
		for (const value of [
			'Bonn',
			null,
			{ value: 'Bonn' },
			{ mode: 1, value: 'Bonn' },
			{ mode: 'equals' },
			{ mode: 'equals', value: 2 }
		]) {
			expect(inputsOf('city', value)).toEqual([]);
		}
	});

	test('nation names become the codes they match', () => {
		expect(inputsOf('nation', { mode: 'contains', value: 'Deu' })).toEqual([
			{ column: 'nation', mode: 'contains', text: 'Deu', values: ['DEU'] }
		]);
		expect(inputsOf('nation', { mode: 'isEmpty', value: '' })).toEqual([
			{ column: 'nation', mode: 'isEmpty', text: '' }
		]);
	});

	test('enum keeps the strings', () => {
		expect(inputsOf('gender', ['MALE', 3, 'FEMALE'])).toEqual([
			{ column: 'gender', values: ['MALE', 'FEMALE'] }
		]);
		expect(inputsOf('gender', 'MALE')).toEqual([]);
	});

	test('boolean', () => {
		expect(inputsOf('accepted', false)).toEqual([{ column: 'accepted', bool: false }]);
		expect(inputsOf('accepted', 'true')).toEqual([]);
	});

	test('range sends the bounds given', () => {
		expect(inputsOf('age', [16, 18])).toEqual([{ column: 'age', min: 16, max: 18 }]);
		expect(inputsOf('age', [undefined, 18])).toEqual([{ column: 'age', max: 18 }]);
		expect(inputsOf('age', [16])).toEqual([{ column: 'age', min: 16 }]);
		expect(inputsOf('age', 16)).toEqual([]);
	});

	test('columns without a kind are left out', () => {
		expect(
			toFilterInputs(
				[
					{ id: 'unknown', value: 'x' },
					{ id: 'accepted', value: true }
				],
				kinds
			)
		).toEqual([{ column: 'accepted', bool: true }]);
	});
});
