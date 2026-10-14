import type { JSONContent } from '@tiptap/core';
import { describe, expect, test } from 'vitest';
import {
	extractPlaceholders,
	replacePlaceholders,
	validatePlaceholders
} from './snippetPlaceholders';

const doc = (...texts: string[]): JSONContent => ({
	type: 'doc',
	content: texts.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] }))
});

describe('extractPlaceholders', () => {
	test('collects every distinct, trimmed placeholder across nested nodes', () => {
		expect(
			extractPlaceholders(
				doc(
					'Hallo {{ name }}, {{Ländercode}}!',
					'Nochmal {{name}} und {{Dies ist eine Nachricht!}}'
				)
			)
		).toEqual(['name', 'Ländercode', 'Dies ist eine Nachricht!']);
	});

	test('ignores blank placeholders, text-less nodes and nodes of other types', () => {
		const content: JSONContent = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: '{{  }}' }, { type: 'text' }] },
				{ type: 'image', text: '{{alt}}' },
				{ type: 'paragraph' }
			]
		};
		expect(extractPlaceholders(content)).toEqual([]);
	});
});

describe('validatePlaceholders', () => {
	test('sorts placeholders into valid, too long and empty', () => {
		const long = 'x'.repeat(51);
		const result = validatePlaceholders(doc(`{{a}} {{ a }} {{b}} {{${long}}} {{   }} {{}}`));
		expect(result).toEqual({
			valid: ['a', 'b'],
			malformed: [],
			tooLong: [long],
			empty: ['{{}}', '{{   }}']
		});
	});

	test('accepts a placeholder of exactly the maximum length', () => {
		expect(validatePlaceholders(doc(`{{${'x'.repeat(50)}}}`)).valid).toEqual(['x'.repeat(50)]);
	});

	test('reports unclosed placeholders, shortened past 30 characters', () => {
		expect(validatePlaceholders(doc('Hallo {{name')).malformed).toEqual(['{{name']);
		const unclosed = `{{${'y'.repeat(40)}`;
		expect(validatePlaceholders(doc(unclosed)).malformed).toEqual([`${unclosed.slice(0, 30)}...`]);
	});

	test('reports a placeholder opened again before it is closed, once per fragment', () => {
		expect(validatePlaceholders(doc('{{a {{b}} und {{c}}', '{{a {{b}}')).malformed).toEqual([
			'{{a {{b}}'
		]);
	});

	test('finds nothing wrong in plain text', () => {
		expect(validatePlaceholders(doc('Keine Platzhalter', '{einfach}'))).toEqual({
			valid: [],
			malformed: [],
			tooLong: [],
			empty: []
		});
	});
});

describe('replacePlaceholders', () => {
	test('replaces every occurrence, tolerating spaces, without touching the original', () => {
		const original = doc('Hallo {{name}} und {{ name }}, {{other}}');
		const replaced = replacePlaceholders(original, { name: 'Erika' });
		expect(replaced).toEqual(doc('Hallo Erika und Erika, {{other}}'));
		expect(original).toEqual(doc('Hallo {{name}} und {{ name }}, {{other}}'));
	});

	test('treats regex characters in keys literally', () => {
		expect(replacePlaceholders(doc('{{a.b}} {{axb}}'), { 'a.b': '1' })).toEqual(doc('1 {{axb}}'));
	});

	test('removes text nodes the replacement leaves empty', () => {
		const content: JSONContent = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: '{{gone}}' },
						{ type: 'hardBreak' },
						{ type: 'text', text: 'bleibt' }
					]
				}
			]
		};
		expect(replacePlaceholders(content, { gone: '' })).toEqual({
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'hardBreak' }, { type: 'text', text: 'bleibt' }] }
			]
		});
	});

	test('passes empty content through', () => {
		const empty: JSONContent = {};
		expect(replacePlaceholders(empty, { a: 'b' })).toEqual({});
	});
});
