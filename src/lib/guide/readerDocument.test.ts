import { expect, test } from 'vitest';
import { hrefResolver, resolveDocument } from './readerDocument';
import type { GuideDocument } from './document';

const resolve = hrefResolver({
	urls: new Map([['f1', 'https://bucket/f1']]),
	inGuide: (pageId) => pageId === 'in'
});

test('hrefResolver turns files into URLs and drops pages outside the guide', () => {
	expect(resolve('file:f1')).toBe('https://bucket/f1');
	expect(resolve('file:gone')).toBeUndefined();
	expect(resolve('guide:in')).toBe('guide:in');
	expect(resolve('guide:out')).toBeUndefined();
	expect(resolve('https://dmun.de')).toBe('https://dmun.de');
	expect(resolve(42)).toBeUndefined();
});

test('resolveDocument resolves images, buttons and links and anchors the headings', () => {
	const doc: GuideDocument = {
		type: 'doc',
		content: [
			{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Ziele' }] },
			{ type: 'image', attrs: { src: 'file:f1' } },
			{ type: 'image', attrs: { src: 'file:gone' } },
			{ type: 'button', attrs: { href: 'guide:out', label: 'x' } },
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'a',
						marks: [{ type: 'link', attrs: { href: 'guide:out' } }, { type: 'bold' }]
					},
					{ type: 'text', text: 'b', marks: [{ type: 'link', attrs: { href: 'guide:in' } }] }
				]
			}
		]
	};
	const { content, headings } = resolveDocument({ doc, resolve });
	expect(headings).toEqual([{ id: 'ziele', level: 2, text: 'Ziele' }]);
	expect(content.content?.map((node) => node.type)).toEqual(['heading', 'image', 'paragraph']);
	expect(content.content?.[0].attrs?.id).toBe('ziele');
	expect(content.content?.[1].attrs?.src).toBe('https://bucket/f1');
	expect(content.content?.[2].content?.[0].marks).toEqual([{ type: 'bold' }]);
	expect(content.content?.[2].content?.[1].marks?.[0].attrs?.href).toBe('guide:in');
});

test('an empty heading takes no anchor, so later headings and the points box keep theirs', () => {
	const heading = (text?: string) => ({
		type: 'heading',
		attrs: { level: 2 },
		...(text ? { content: [{ type: 'text', text }] } : {})
	});
	const doc: GuideDocument = {
		type: 'doc',
		content: [
			heading(),
			{
				type: 'discussionPoints',
				attrs: { heading: 'Punkte zur Diskussion', points: ['Eins'] }
			},
			heading('Hintergrund')
		]
	};
	const { content, headings } = resolveDocument({ doc, resolve });
	expect(headings.map((h) => h.id)).toEqual(['punkte-zur-diskussion', 'hintergrund']);
	expect(content.content?.map((node) => node.attrs?.id)).toEqual([
		undefined,
		'punkte-zur-diskussion',
		'hintergrund'
	]);
});
