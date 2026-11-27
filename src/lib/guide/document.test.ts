import { describe, expect, test } from 'vitest';
import {
	discussionPointsOf,
	fillPlaceholders,
	guideDocumentSchema,
	headingsOf,
	isSafeHref,
	parseReaderDocument,
	placeholdersIn,
	referencedFileIds,
	referencedPageIds,
	richBlocksIn,
	youtubeIdOf,
	type GuideDocument
} from './document';

const paragraph = (text: string) => ({
	type: 'paragraph',
	content: [{ type: 'text', text }]
});

const doc: GuideDocument = {
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Über {{Gremium}}' }] },
		paragraph('Willkommen bei {{Konferenz}}!'),
		paragraph('{{Themen}}'),
		{ type: 'image', attrs: { src: 'file:img1', alt: 'Bild' } },
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'Weiter', marks: [{ type: 'link', attrs: { href: 'guide:p2' } }] },
				{ type: 'text', text: ' Datei', marks: [{ type: 'link', attrs: { href: 'file:pdf1' } }] }
			]
		},
		{
			type: 'callout',
			attrs: { icon: 'question' },
			content: [
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Über {{Gremium}}' }]
				}
			]
		},
		{ type: 'button', attrs: { href: 'guide:p3', label: 'Schritt 5' } }
	]
};

test('references are collected from images, links and buttons', () => {
	expect(referencedFileIds(doc).sort()).toEqual(['img1', 'pdf1']);
	expect(referencedPageIds(doc).sort()).toEqual(['p2', 'p3']);
	expect(richBlocksIn(doc).sort()).toEqual(['button', 'callout']);
});

describe('fillPlaceholders', () => {
	test('fills the conference, the committee and a list of the topics', () => {
		const filled = fillPlaceholders(doc, {
			conference: 'MUN-SH 2027',
			committee: { name: 'Sicherheitsrat', agendaItems: ['Klima', 'Frieden'] }
		});
		expect(filled.content?.[0].content?.[0].text).toBe('Über Sicherheitsrat');
		expect(filled.content?.[1].content?.[0].text).toBe('Willkommen bei MUN-SH 2027!');
		expect(filled.content?.[2].type).toBe('bulletList');
		expect(filled.content?.[2].content).toHaveLength(2);
	});

	test('keeps the committee placeholders outside a committee', () => {
		const filled = fillPlaceholders(doc, { conference: 'MUN-SH 2027' });
		expect(filled.content?.[0].content?.[0].text).toBe('Über {{Gremium}}');
		expect(filled.content?.[2].type).toBe('paragraph');
	});

	describe('points for discussion', () => {
		const points = { heading: 'Punkte zur Diskussion', points: ['Finanzierung?', 'Mandat?'] };
		const page = (...content: NonNullable<GuideDocument['content']>) =>
			({ type: 'doc', content }) satisfies GuideDocument;

		test('become a highlighted box where the placeholder stands alone', () => {
			const filled = fillPlaceholders(
				page(paragraph('Einleitung'), paragraph('{{Diskussionspunkte}}'), paragraph('Ende')),
				{ conference: 'MUN-SH 2027', discussionPoints: points }
			);
			expect(filled.content?.map((node) => node.type)).toEqual([
				'paragraph',
				'discussionPoints',
				'paragraph'
			]);
			expect(discussionPointsOf(filled.content?.[1] ?? { type: 'paragraph' })).toEqual(points);
			// a heading of the table of contents
			expect(headingsOf(filled)).toEqual([
				{ id: 'punkte-zur-diskussion', level: 2, text: 'Punkte zur Diskussion' }
			]);
			// readers get it, a stored page cannot hold it
			expect(parseReaderDocument(filled)).toEqual(filled);
			expect(guideDocumentSchema.safeParse(filled).success).toBe(false);
		});

		test('go below the title when the page has no placeholder', () => {
			const filled = fillPlaceholders(page(paragraph('Einleitung')), {
				conference: 'MUN-SH 2027',
				discussionPoints: points
			});
			expect(filled.content?.map((node) => node.type)).toEqual(['discussionPoints', 'paragraph']);
		});

		test('read in one line inside a sentence', () => {
			const filled = fillPlaceholders(page(paragraph('Fragen: {{Diskussionspunkte}}')), {
				conference: 'MUN-SH 2027',
				discussionPoints: points
			});
			expect(filled.content).toHaveLength(1);
			expect(filled.content?.[0].content?.[0].text).toBe('Fragen: Finanzierung?; Mandat?');
		});

		test('leave nothing behind without points', () => {
			const empty = { heading: 'Punkte zur Diskussion', points: [] };
			expect(
				fillPlaceholders(page(paragraph('{{Diskussionspunkte}}'), paragraph('Text')), {
					conference: 'MUN-SH 2027',
					discussionPoints: empty
				}).content?.map((node) => node.type)
			).toEqual(['paragraph']);
			expect(
				fillPlaceholders(page(paragraph('Text')), {
					conference: 'MUN-SH 2027',
					discussionPoints: empty
				}).content
			).toHaveLength(1);
		});

		test('stay as they are off agenda item pages', () => {
			const filled = fillPlaceholders(page(paragraph('{{Diskussionspunkte}}')), {
				conference: 'MUN-SH 2027'
			});
			expect(filled.content?.[0].content?.[0].text).toBe('{{Diskussionspunkte}}');
		});
	});

	test('placeholdersIn lists what is used', () => {
		expect(placeholdersIn(doc).sort()).toEqual(['Gremium', 'Konferenz', 'Themen']);
	});
});

test('headingsOf gives unique anchors', () => {
	expect(headingsOf(doc)).toEqual([
		{ id: 'uber-gremium', level: 2, text: 'Über {{Gremium}}' },
		{ id: 'uber-gremium-2', level: 2, text: 'Über {{Gremium}}' }
	]);
});

test('the schema refuses unknown nodes', () => {
	expect(guideDocumentSchema.safeParse(doc).success).toBe(true);
	expect(
		guideDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'script' }] }).success
	).toBe(false);
});

test('isSafeHref allows the web, mail and references only', () => {
	expect(isSafeHref('https://dmun.de')).toBe(true);
	expect(isSafeHref('guide:abc')).toBe(true);
	expect(isSafeHref('javascript:alert(1)')).toBe(false);
});

test('youtubeIdOf reads the common URL forms', () => {
	expect(youtubeIdOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	expect(youtubeIdOf('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	expect(youtubeIdOf('https://vimeo.com/1')).toBeUndefined();
});
