import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import HardBreak from '@tiptap/extension-hard-break';
import Blockquote from '@tiptap/extension-blockquote';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import { markdownToReviewDocument } from './reviewMarkdown';

/** The nodes and marks of the review editor (`ReviewFormat.svelte`) that a draft can hold. */
const reviewSchema = getSchema([
	Document,
	Paragraph,
	Text,
	Bold,
	Italic,
	HardBreak,
	Blockquote,
	Heading.configure({ levels: [2, 3] }),
	Link,
	BulletList,
	OrderedList,
	ListItem
]);

/** Throws when the document is not valid in the review editor's schema. */
function assertValid(document: ReturnType<typeof markdownToReviewDocument>) {
	ProseMirrorNode.fromJSON(reviewSchema, document).check();
}

describe('markdownToReviewDocument', () => {
	it('turns paragraphs and inline formatting into the editor document', () => {
		const document = markdownToReviewDocument('Ein **starkes** und *klares*\nPapier.');
		expect(document).toEqual({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Ein ' },
						{ type: 'text', text: 'starkes', marks: [{ type: 'bold' }] },
						{ type: 'text', text: ' und ' },
						{ type: 'text', text: 'klares', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' Papier.' }
					]
				}
			]
		});
		assertValid(document);
	});

	it('takes quotes literally, one quote per paragraph', () => {
		const document = markdownToReviewDocument(
			'> 1. Die *Generalversammlung* fordert\n> alle Staaten auf\n>\n> zweites Zitat\n\nDanach.'
		);
		expect(document.content).toEqual([
			{
				type: 'blockquote',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: '1. Die *Generalversammlung* fordert alle Staaten auf' }
						]
					}
				]
			},
			{
				type: 'blockquote',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'zweites Zitat' }] }]
			},
			{ type: 'paragraph', content: [{ type: 'text', text: 'Danach.' }] }
		]);
		assertValid(document);
	});

	it('keeps lists, nested ones and their start', () => {
		const document = markdownToReviewDocument('3. drei\n4. vier\n   - innen\n\n- **a**\n- b');
		expect(document.content?.[0]).toMatchObject({ type: 'orderedList', attrs: { start: 3 } });
		expect(document.content?.[0]?.content?.[1]?.content?.[1]).toMatchObject({
			type: 'bulletList'
		});
		expect(document.content?.[1]).toMatchObject({ type: 'bulletList' });
		assertValid(document);
	});

	it('starts a list item with a paragraph, even when it opens with a quote', () => {
		const document = markdownToReviewDocument('- > Bitte so lassen\n- weiter');
		expect(document.content?.[0]?.content?.[0]?.content?.map((node) => node.type)).toEqual([
			'paragraph',
			'blockquote'
		]);
		assertValid(document);
	});

	it('clamps headings to the levels the editor offers', () => {
		const document = markdownToReviewDocument('# Eins\n\n#### Vier');
		expect(document.content?.map((node) => node.attrs?.level)).toEqual([2, 3]);
		assertValid(document);
	});

	it('links only to web addresses', () => {
		const document = markdownToReviewDocument(
			'[Leitfaden](https://guide.dmun.de) und [böse](javascript:alert(1))'
		);
		expect(document.content?.[0]?.content).toEqual([
			{
				type: 'text',
				text: 'Leitfaden',
				marks: [{ type: 'link', attrs: { href: 'https://guide.dmun.de' } }]
			},
			{ type: 'text', text: ' und ' },
			{ type: 'text', text: 'böse' }
		]);
		assertValid(document);
	});

	it('keeps whatever else as plain text', () => {
		const document = markdownToReviewDocument('`code` & <b>html</b>\n\n```\nBlock\n```\n\n---');
		expect(JSON.stringify(document)).toContain('code');
		expect(JSON.stringify(document)).toContain('<b>');
		expect(JSON.stringify(document)).toContain('Block');
		assertValid(document);
	});

	it('answers a valid empty document for blank input', () => {
		const document = markdownToReviewDocument('   \n\n');
		expect(document).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
		assertValid(document);
	});
});
