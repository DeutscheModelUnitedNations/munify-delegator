import { describe, expect, test } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { m } from '$lib/paraglide/messages';
import { checkSnippet, saveErrorMessage } from './snippetValidation';

const doc = (text: string): JSONContent => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

describe('checkSnippet', () => {
	test('requires a name', () => {
		expect(checkSnippet('  ', doc('Text'))).toEqual({
			error: m.snippetNameRequired(),
			hasPlaceholders: false
		});
	});

	test('requires text content', () => {
		expect(checkSnippet('Greeting', { type: 'doc', content: [{ type: 'paragraph' }] })).toEqual({
			error: m.snippetContentRequired(),
			hasPlaceholders: false
		});
	});

	test('rejects malformed, empty and overlong placeholders', () => {
		expect(checkSnippet('Greeting', doc('Dear {{name')).error).toBe(m.malformedPlaceholders());
		expect(checkSnippet('Greeting', doc('Dear {{}}')).error).toBe(m.emptyPlaceholders());
		expect(checkSnippet('Greeting', doc(`Dear {{${'x'.repeat(51)}}}`)).error).toBe(
			m.placeholderTooLong()
		);
	});

	test('accepts a snippet and reports whether it has placeholders', () => {
		expect(checkSnippet('Greeting', doc('Dear {{name}}'))).toEqual({
			error: null,
			hasPlaceholders: true
		});
		expect(checkSnippet('Greeting', doc('Dear delegate'))).toEqual({
			error: null,
			hasPlaceholders: false
		});
	});
});

describe('saveErrorMessage', () => {
	test('shows the error message, or a generic one', () => {
		expect(saveErrorMessage(new Error('Name taken'))).toBe('Name taken');
		expect(saveErrorMessage('boom')).toBe(m.genericError());
	});
});
