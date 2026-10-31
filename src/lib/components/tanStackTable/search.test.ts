import { describe, expect, test } from 'vitest';
import { createFuzzySearch, rowSearchText } from './search';

const people = [
	{ name: 'Meyer Anna', note: 'Gymnasium Bonn' },
	{ name: 'Schmidt Jonas', note: 'Gymnasium Köln, schreibt mit Jonas Meyer zusammen' },
	{ name: 'Jonas Becker', note: 'Gesamtschule Essen' }
];
const search = createFuzzySearch({ rows: people, textOf: (p) => ` ${p.name} ${p.note}` });

describe('createFuzzySearch', () => {
	test('an empty search keeps every row in order', () => {
		expect(search('  ')).toEqual(people);
	});

	test('the exact name comes first', () => {
		expect(search('jonas')[0].name).toBe('Jonas Becker');
	});

	test('finds rows with typos', () => {
		expect(search('meier').map((p) => p.name)).toContain('Meyer Anna');
	});

	test('every term has to match', () => {
		expect(search('bonn anna').map((p) => p.name)).toEqual(['Meyer Anna']);
	});

	test('finds a typo far into a long text', () => {
		const long = [{ text: `Anna Meyer ${'Gymnasium Bonn '.repeat(40)} anna.meyer@example.org` }];
		const far = createFuzzySearch({ rows: long, textOf: (row) => row.text });
		expect(far('meier')).toHaveLength(1);
		expect(far('anna.maier@example.org')).toHaveLength(1);
	});

	test('of equally good matches the earlier one comes first', () => {
		const rows = ['Schmidt Jonas', 'Jonas Becker'];
		expect(createFuzzySearch({ rows, textOf: (row) => row })('jonas')[0]).toBe('Jonas Becker');
	});
});

describe('rowSearchText', () => {
	const row = { name: 'Anna', age: 31, school: 'Bonn' };

	test('joins the string values of accessor keys and functions in column order', () => {
		const text = rowSearchText({
			columns: [
				{ accessorKey: 'name' },
				{ id: 'where', accessorFn: (r: typeof row) => r.school },
				{ accessorKey: 'age' },
				{ id: 'actions' }
			],
			row,
			index: 0
		});
		expect(text).toBe(' Anna Bonn');
	});
});
