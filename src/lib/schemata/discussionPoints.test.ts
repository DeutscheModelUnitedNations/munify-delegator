import { describe, expect, test } from 'vitest';
import { discussionPointsSchema, withoutBlankPoints } from './discussionPoints';

describe('discussionPointsSchema', () => {
	test('keeps the order and folds whitespace, line breaks included', () => {
		expect(discussionPointsSchema().parse(['  Erstens ', 'Zweitens\nüber zwei Zeilen'])).toEqual([
			'Erstens',
			'Zweitens über zwei Zeilen'
		]);
	});

	test('has no limits but refuses an empty point', () => {
		const many = Array.from({ length: 200 }, (_, i) => `Punkt ${i} ${'lang '.repeat(200)}`);
		expect(discussionPointsSchema().parse(many)).toHaveLength(200);
		expect(discussionPointsSchema().safeParse(['gut', '   ']).success).toBe(false);
		expect(discussionPointsSchema().parse([])).toEqual([]);
	});
});

test('withoutBlankPoints folds whitespace and leaves blank points out', () => {
	expect(withoutBlankPoints(['Erstens', '', '  Zweitens  ', ' \n ', 'Drittens'])).toEqual([
		'Erstens',
		'Zweitens',
		'Drittens'
	]);
	expect(withoutBlankPoints([])).toEqual([]);
});
