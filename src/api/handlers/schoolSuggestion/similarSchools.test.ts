import { describe, expect, it } from 'vitest';
import { findSimilarSchools, suggestionKey, type SchoolVariant } from './similarSchools';

const school = (schoolId: string, name: string, sumParticipants = 1): SchoolVariant => ({
	schoolId,
	school: name,
	sumParticipants
});

const ids = (suggestion: { variants: SchoolVariant[] }) =>
	suggestion.variants.map((variant) => variant.schoolId);

describe('findSimilarSchools', () => {
	it('groups spellings of one school, the most used first', () => {
		const [suggestion, ...rest] = findSimilarSchools([
			school('a', 'Goethe-Gymnasium Hamburg', 2),
			school('b', 'goethe gymnasium hamburg', 5),
			school('c', 'Schiller-Schule Berlin')
		]);
		expect(rest).toEqual([]);
		expect(ids(suggestion)).toEqual(['b', 'a']);
		expect(suggestion.similarity).toBe(1);
	});

	it('finds umlauts, word order and small typos', () => {
		const suggestions = findSimilarSchools([
			school('a', 'Gymnasium Lüneburg'),
			school('b', 'Gymnasium Luneburg'),
			school('c', 'Lessingschule Kiel'),
			school('d', 'Kiel Lessingschule'),
			school('e', 'Humboldtschule Bonn'),
			school('f', 'Humbodltschule Bonn')
		]);
		expect(suggestions.map(ids).map((group) => group.toSorted())).toEqual(
			expect.arrayContaining([
				['a', 'b'],
				['c', 'd'],
				['e', 'f']
			])
		);
		expect(suggestions).toHaveLength(3);
		const typo = suggestions.find((suggestion) => ids(suggestion).includes('e'));
		expect(typo?.similarity).toBeLessThan(1);
		expect(suggestions.at(-1)).toBe(typo);
	});

	it('joins a chain into one group with its lowest similarity', () => {
		const [suggestion] = findSimilarSchools([
			school('a', 'Humboldtschule Bonn'),
			school('b', 'Humboldtschule Bonn'),
			school('c', 'Humbodltschule Bonn')
		]);
		expect(ids(suggestion).toSorted()).toEqual(['a', 'b', 'c']);
		expect(suggestion.similarity).toBeLessThan(1);
	});

	it('leaves different schools apart', () => {
		expect(
			findSimilarSchools([school('a', 'Gymnasium Altona'), school('b', 'Gymnasium Blankenese')])
		).toEqual([]);
		expect(findSimilarSchools([])).toEqual([]);
	});
});

describe('suggestionKey', () => {
	it('names a group by its sorted ids', () => {
		expect(suggestionKey(['b', 'a'])).toBe('["a","b"]');
	});
});
