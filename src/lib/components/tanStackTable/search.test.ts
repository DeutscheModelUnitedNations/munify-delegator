import { describe, expect, test } from 'vitest';
import { createFuzzySearch } from './search';

const people = [
	{ name: 'Meyer Anna', note: 'Gymnasium Bonn' },
	{ name: 'Schmidt Jonas', note: 'Gymnasium Köln, schreibt mit Jonas Meyer zusammen' },
	{ name: 'Jonas Becker', note: 'Gesamtschule Essen' }
];
const search = createFuzzySearch(people, (p) => ` ${p.name} ${p.note}`);

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
});
