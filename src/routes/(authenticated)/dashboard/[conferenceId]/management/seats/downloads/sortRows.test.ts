import { describe, expect, test } from 'vitest';
import { compareByText } from './sortRows';

describe('compareByText', () => {
	test('sorts by the key, with missing keys first', () => {
		const items = [{ k: 'b' }, { k: undefined }, { k: 'a' }, { k: null }];
		expect(items.toSorted(compareByText((x) => x.k)).map((x) => x.k)).toEqual([
			undefined,
			null,
			'a',
			'b'
		]);
	});
});
