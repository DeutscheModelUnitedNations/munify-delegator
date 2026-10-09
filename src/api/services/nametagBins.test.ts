import { describe, expect, test } from 'vitest';
import { nationInitial, splitIntoNametagBins } from './nametagBins';

const counts = (entries: Record<string, number>) =>
	Object.entries(entries).map(([letter, count]) => ({ letter, count }));

describe('nationInitial', () => {
	test("files a nation by its name in the reader's language", () => {
		expect(nationInitial('DEU', 'en')).toBe('G');
		expect(nationInitial('DEU', 'de')).toBe('D');
		expect(nationInitial('deu', 'en')).toBe('G');
	});

	test('drops diacritics, so Ägypten is an A', () => {
		expect(nationInitial('EGY', 'de')).toBe('A');
		expect(nationInitial('EGY', 'en')).toBe('E');
		expect(nationInitial('ALA', 'en')).toBe('A');
	});

	test('any other language reads the English names', () => {
		expect(nationInitial('DEU', 'fr')).toBe('G');
	});

	test('falls back to the code for an unknown nation', () => {
		expect(nationInitial('QQQ', 'en')).toBe('Q');
	});
});

describe('splitIntoNametagBins', () => {
	test('never divides a letter and keeps the letters in order', () => {
		const bins = splitIntoNametagBins(counts({ A: 10, B: 10, C: 10, D: 10, E: 10, F: 10 }), 0, 3);
		expect(bins.map((bin) => bin.letters)).toEqual([
			['A', 'B'],
			['C', 'D'],
			['E', 'F']
		]);
	});

	test('a big letter stays whole in one bin', () => {
		const bins = splitIntoNametagBins(counts({ A: 5, G: 40, M: 5, S: 5 }), 0, 3);
		expect(bins.filter((bin) => bin.letters.includes('G'))).toHaveLength(1);
		expect(bins.flatMap((bin) => bin.letters)).toEqual(['A', 'G', 'M', 'S']);
	});

	test('everyone without a nation gets a table of their own after the letter tables', () => {
		const bins = splitIntoNametagBins(counts({ A: 10, B: 10, C: 10, D: 10, E: 10, F: 10 }), 20, 3);
		expect(bins).toHaveLength(4);
		expect(bins.slice(0, 3).every((bin) => bin.otherParticipants === 0)).toBe(true);
		expect(bins[3]).toMatchObject({
			letters: [],
			fromLetter: null,
			otherParticipants: 20,
			nationParticipants: 0
		});
		expect(bins.slice(0, 3).map((bin) => bin.nationParticipants)).toEqual([20, 20, 20]);
	});

	test('the ranges cover the whole alphabet without gaps', () => {
		const bins = splitIntoNametagBins(counts({ B: 10, G: 10, M: 10, T: 10 }), 0, 2);
		expect(bins.map((bin) => [bin.fromLetter, bin.toLetter])).toEqual([
			['A', 'L'],
			['M', 'Z']
		]);
	});

	test('more bins than letters leaves the surplus bins empty', () => {
		const bins = splitIntoNametagBins(counts({ A: 3, B: 3 }), 0, 4);
		expect(bins).toHaveLength(4);
		expect(bins.filter((bin) => bin.letters.length > 0)).toHaveLength(2);
		expect(bins.flatMap((bin) => bin.letters).sort()).toEqual(['A', 'B']);
	});

	test('a single bin takes everyone', () => {
		const bins = splitIntoNametagBins(counts({ A: 3, Z: 4 }), 2, 1);
		expect(bins[0]).toMatchObject({ fromLetter: 'A', toLetter: 'Z', nationParticipants: 7 });
		expect(bins[1]).toMatchObject({ otherParticipants: 2 });
	});

	test('nobody seated yields empty bins', () => {
		const bins = splitIntoNametagBins([], 0, 3);
		expect(bins).toHaveLength(3);
		expect(bins.every((bin) => bin.letters.length === 0 && bin.fromLetter === null)).toBe(true);
	});
});
