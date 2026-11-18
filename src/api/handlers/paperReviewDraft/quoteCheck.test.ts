import { describe, expect, it } from 'vitest';
import { paperBlocks, quotesOf, unmatchedQuotes } from './quoteCheck';
import { markdownToReviewDocument } from './reviewMarkdown';

const paper = {
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Einleitung' }] },
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'Kenia setzt sich für ' },
				{ type: 'text', text: 'nachhaltige', marks: [{ type: 'bold' }] },
				{ type: 'text', text: '  Entwicklung ein.' }
			]
		},
		{ type: 'paragraph', content: [{ type: 'text', text: 'Zweiter Absatz.' }] },
		{
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Punkt eins' }] }]
				}
			]
		}
	]
};

describe('quotesOf', () => {
	it('runs a quote’s text together, whitespace collapsed', () => {
		expect(
			quotesOf({
				type: 'doc',
				content: [
					{
						type: 'blockquote',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: ' a \n b ' }] }]
					},
					{ type: 'blockquote', content: [{ type: 'paragraph' }] }
				]
			})
		).toEqual(['a b']);
	});
});

describe('unmatchedQuotes', () => {
	it('finds quotes inside one block, across marks and whitespace', () => {
		const review = markdownToReviewDocument(
			'> setzt sich für nachhaltige Entwicklung\n\n> Einleitung\n\n> Punkt eins'
		);
		expect(unmatchedQuotes({ review, paperContent: paper })).toEqual([]);
	});

	it('lists quotes not in the paper and quotes spanning two blocks', () => {
		const review = markdownToReviewDocument(
			'> Kenia setzt sich gegen\n\n> Entwicklung ein. Zweiter Absatz.'
		);
		expect(unmatchedQuotes({ review, paperContent: paper })).toEqual([
			'Kenia setzt sich gegen',
			'Entwicklung ein. Zweiter Absatz.'
		]);
	});

	it('searches the clauses of a resolution', () => {
		const resolution = {
			committeeName: 'GV',
			preamble: [{ id: 'p1', content: 'in Anerkennung der Lage,' }],
			operative: [
				{
					id: 'o1',
					blocks: [
						{ type: 'text', id: 't1', content: 'fordert alle Staaten auf,' },
						{
							type: 'subclauses',
							id: 'b1',
							items: [
								{ id: 's1', blocks: [{ type: 'text', id: 't2', content: 'Hilfe zu leisten' }] }
							]
						}
					]
				}
			]
		};
		expect(paperBlocks(resolution)).toContain('fordert alle Staaten auf,');
		const review = markdownToReviewDocument(
			'> fordert alle Staaten auf\n\n> fordert alle Staaten auf, Hilfe zu leisten\n\n> fehlt'
		);
		expect(unmatchedQuotes({ review, paperContent: resolution })).toEqual(['fehlt']);
	});
});
