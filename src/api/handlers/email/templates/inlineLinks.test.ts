import { describe, expect, test } from 'vitest';
import { inlineParts } from './inlineLinks';

describe('inlineParts', () => {
	test('turns a Markdown link into a link part between the text around it', () => {
		expect(inlineParts('The [manual](https://chase.example.org/docs/x) explains it.')).toEqual([
			{ text: 'The ' },
			{ text: 'manual', href: 'https://chase.example.org/docs/x' },
			{ text: ' explains it.' }
		]);
	});

	test('keeps a paragraph without links as one text part', () => {
		expect(inlineParts('Sign in beforehand.')).toEqual([{ text: 'Sign in beforehand.' }]);
	});

	test('finds several links', () => {
		expect(inlineParts('[a](http://localhost:5173/a) and [b](https://b.org)')).toEqual([
			{ text: 'a', href: 'http://localhost:5173/a' },
			{ text: ' and ' },
			{ text: 'b', href: 'https://b.org' }
		]);
	});

	test('leaves anything but http(s) as text', () => {
		const paragraph = 'Click [here](javascript:alert(1)) or [mail](mailto:a@b.c)';
		expect(inlineParts(paragraph)).toEqual([{ text: paragraph }]);
	});
});
