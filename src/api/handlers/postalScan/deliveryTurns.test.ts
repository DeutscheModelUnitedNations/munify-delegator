import { expect, test } from 'vitest';
import { inTurn } from './deliveryTurns';

test('people take turns, those not served yet first, as they came', () => {
	const people = ['a', 'b', 'c'];
	expect(inTurn({ people, lastServed: new Map() })).toEqual(['a', 'b', 'c']);
	expect(inTurn({ people, lastServed: new Map([['a', 1]]) })).toEqual(['b', 'c', 'a']);
	const all = new Map([
		['a', 3],
		['b', 1],
		['c', 2]
	]);
	expect(inTurn({ people, lastServed: all })).toEqual(['b', 'c', 'a']);
});
