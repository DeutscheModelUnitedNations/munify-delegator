import { describe, expect, test } from 'vitest';
import { guideDocumentToMarkdown, markdownToGuideDocument } from './guideMarkdown';
import { guideDocumentSchema, type GuideDocument } from '#lib/guide/document';

describe('markdownToGuideDocument', () => {
	test('reads headings, marks, lists, quotes and rules', () => {
		const doc = markdownToGuideDocument(
			'# Titel\n\nText mit **fett**, *kursiv*, ~~weg~~ und `code`.\n\n- eins\n- zwei\n\n1. a\n\n> Zitat\n\n---\n\n##### tief'
		);
		expect(doc.content?.map((node) => node.type)).toEqual([
			'heading',
			'paragraph',
			'bulletList',
			'orderedList',
			'blockquote',
			'horizontalRule',
			'heading'
		]);
		expect(doc.content?.[0].attrs).toEqual({ level: 2 });
		expect(doc.content?.at(-1)?.attrs).toEqual({ level: 4 });
		const marks = doc.content?.[1].content?.flatMap((node) => node.marks?.map((m) => m.type) ?? []);
		expect(marks).toEqual(['bold', 'italic', 'strike', 'code']);
		expect(guideDocumentSchema.safeParse(doc).success).toBe(true);
	});

	test('keeps guide and file links, drops unsafe ones', () => {
		const doc = markdownToGuideDocument(
			'[Weiter](guide:p2) [PDF](file:f1) [Web](https://dmun.de) [Böse](javascript:alert(1))'
		);
		const hrefs = doc.content?.[0].content?.flatMap(
			(node) => node.marks?.map((mark) => mark.attrs?.href) ?? []
		);
		expect(hrefs).toEqual(['guide:p2', 'file:f1', 'https://dmun.de']);
	});

	test('lifts images out of their paragraph', () => {
		const doc = markdownToGuideDocument('Davor ![Karte © OSM](file:img) danach');
		expect(doc.content?.map((node) => node.type)).toEqual(['paragraph', 'image', 'paragraph']);
		expect(doc.content?.[1].attrs).toEqual({ src: 'file:img', alt: 'Karte © OSM' });
	});

	test('an empty text is one empty paragraph', () => {
		expect(markdownToGuideDocument('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
	});
});

describe('guideDocumentToMarkdown', () => {
	const doc: GuideDocument = {
		type: 'doc',
		content: [
			{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Teil' }] },
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'fett', marks: [{ type: 'bold' }] },
					{ type: 'text', text: ' und ' },
					{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'guide:x' } }] }
				]
			},
			{
				type: 'bulletList',
				content: [
					{
						type: 'listItem',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }]
					}
				]
			},
			{ type: 'image', attrs: { src: 'file:i', alt: 'Bild' } },
			{ type: 'callout', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] },
			{
				type: 'blockquote',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }]
			}
		]
	};

	test('writes Markdown and names the blocks it left out', () => {
		const { markdown, omittedBlocks } = guideDocumentToMarkdown(doc);
		expect(markdown).toBe(
			'### Teil\n\n**fett** und [Link](guide:x)\n\n- a\n\n![Bild](file:i)\n\n> q'
		);
		expect(omittedBlocks).toEqual(['callout']);
	});

	test('round-trips what Markdown can say', () => {
		const { markdown } = guideDocumentToMarkdown(doc);
		const again = guideDocumentToMarkdown(markdownToGuideDocument(markdown));
		expect(again.markdown).toBe(markdown);
	});
});
