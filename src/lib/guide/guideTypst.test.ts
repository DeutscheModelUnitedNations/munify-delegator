import { describe, expect, test } from 'vitest';
import { committeeTextToTypst, imageFileIdsOf } from './guideTypst';
import type { GuideDocument } from './document';

const doc: GuideDocument = {
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Zusammenfassung' }] },
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: '#1 [wichtig]', marks: [{ type: 'bold' }] },
				{ type: 'text', text: ' siehe ' },
				{ type: 'text', text: 'UN', marks: [{ type: 'link', attrs: { href: 'https://un.org' } }] },
				{ type: 'text', text: ' und ' },
				{ type: 'text', text: 'Schritt 5', marks: [{ type: 'link', attrs: { href: 'guide:p5' } }] }
			]
		},
		{ type: 'image', attrs: { src: 'file:img1', title: 'Karte' } },
		{ type: 'image', attrs: { src: 'file:missing' } },
		{
			type: 'callout',
			attrs: { emoji: '📍', color: 'warning' },
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Achtung' }] }]
		},
		{
			type: 'toggle',
			attrs: { summary: 'Mehr' },
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inhalt' }] }]
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
		{ type: 'button', attrs: { href: 'https://dmun.de', label: 'Los' } },
		{ type: 'button', attrs: { href: 'guide:x', label: 'Intern' } },
		{ type: 'embed', attrs: { url: 'https://youtu.be/dQw4w9WgXcQ' } },
		{ type: 'horizontalRule' },
		{ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }] }
	]
};

describe('committeeTextToTypst', () => {
	const source = committeeTextToTypst({
		doc,
		images: new Map([['img1', 'image-0.png']]),
		header: {
			conference: 'MUN-SH 2027',
			committee: 'Sicherheitsrat (SR)',
			agendaItem: 'Klima',
			committeeLabel: 'Gremium',
			agendaItemLabel: 'Thema',
			emblemPath: 'emblem.png'
		}
	});

	test('escapes text and renders marks and links', () => {
		expect(source).toContain('#strong[\\#1 \\[wichtig\\]]');
		expect(source).toContain('#link("https://un.org")[UN]');
		// a guide link reads as plain text
		expect(source).toContain(' und Schritt 5');
	});

	test('renders the guide blocks', () => {
		expect(source).toContain('#heading(level: 1)[Zusammenfassung]');
		expect(source).toContain('#figure(image("image-0.png", width: 80%), caption: [Karte])');
		expect(source).not.toContain('missing');
		expect(source).toContain('#block(fill: rgb("#fdf4e3")');
		expect(source).toContain('#strong[Mehr]');
		expect(source).toContain('#list([a])');
		expect(source).toContain('#link("https://dmun.de")[→ Los]');
		expect(source).not.toContain('Intern');
		expect(source).toContain('youtu.be');
		expect(source).toContain('#line(length: 100%');
		expect(source).toContain('#quote(block: true)[q]');
	});

	test('puts the header first', () => {
		expect(source).toContain('#image("emblem.png", height: 2.2cm)');
		expect(source).toContain('Thema: Klima');
	});
});

test('imageFileIdsOf lists the images once each, in order', () => {
	expect(imageFileIdsOf(doc)).toEqual(['img1', 'missing']);
});
