import { describe, expect, test } from 'vitest';
import { paperToTypst, type PaperTypstMeta } from './paperTypst';

const meta: PaperTypstMeta = {
	conferenceName: 'MUN-SH 2026',
	paperType: 'Positionspapier',
	committeeLabel: 'Gremium',
	topicLabel: 'Thema',
	disclaimer: 'Kein offizielles Dokument'
};

/** The body of the document: everything after the rule that ends the header. */
function body(content: Parameters<typeof paperToTypst>[0]) {
	return paperToTypst(content, meta).split('#v(8pt)\n\n')[1].trimEnd();
}

const text = (value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) => ({
	type: 'text',
	text: value,
	marks
});

const paragraph = (...content: object[]) => ({ type: 'paragraph', content });

describe('paperToTypst', () => {
	test('renders the conference, paper type and disclaimer', () => {
		const source = paperToTypst(null, meta);
		expect(source).toContain('#text(size: 15pt, weight: "bold")[MUN-SH 2026]');
		expect(source).toContain('#text(size: 11pt)[Positionspapier]');
		expect(source).toContain('#align(center)[Kein offizielles Dokument]');
		expect(body(undefined)).toBe('');
	});

	test('lists only the header lines that are given', () => {
		const withoutDetails = paperToTypst(null, meta);
		expect(withoutDetails).not.toContain('#strong[');
		expect(withoutDetails).not.toContain('Gremium:');

		const source = paperToTypst(null, {
			...meta,
			entityName: 'Deutschland',
			committeeLine: 'General Assembly (GA)',
			topic: 'Klima'
		});
		expect(source).toContain(
			'#strong[Deutschland] #linebreak()\nGremium: General Assembly (GA) #linebreak()\nThema: Klima'
		);
	});

	test('escapes markup characters in text and metadata', () => {
		expect(body({ type: 'doc', content: [paragraph(text('a#b*c_[d]\\e'))] })).toBe(
			'a\\#b\\*c\\_\\[d\\]\\\\e'
		);
		expect(paperToTypst(null, { ...meta, conferenceName: '$100 @ <home>' })).toContain(
			'[\\$100 \\@ \\<home\\>]'
		);
	});

	test('wraps text in every supported mark, in order', () => {
		const marked = text('x', [
			{ type: 'bold' },
			{ type: 'italic' },
			{ type: 'underline' },
			{ type: 'superscript' },
			{ type: 'subscript' },
			{ type: 'unknown' }
		]);
		expect(body({ content: [paragraph(marked)] })).toBe(
			'#sub[#super[#underline[#emph[#strong[x]]]]]'
		);
	});

	test('renders links with an escaped href, and an empty one when it is missing', () => {
		const linked = text('here', [{ type: 'link', attrs: { href: 'https://x.org/"q"' } }]);
		const unlinked = text('there', [{ type: 'link', attrs: { href: 42 } }]);
		expect(body({ content: [paragraph(linked, unlinked)] })).toBe(
			'#link("https://x.org/\\"q\\"")[here]#link("")[there]'
		);
	});

	test('renders hard breaks, untyped text and unexpected inline nodes', () => {
		const content = [
			paragraph(
				text('a'),
				{ type: 'hardBreak' },
				{ text: 'b' },
				{ type: 'mention', content: [text('c')] },
				{ type: 'text' }
			)
		];
		expect(body({ content })).toBe('a#linebreak()bc');
	});

	test('renders an empty paragraph as nothing, and drops it between blocks', () => {
		expect(
			body({ content: [paragraph(text('a')), { type: 'paragraph' }, paragraph(text('b'))] })
		).toBe('a\n\nb');
	});

	test('renders headings with their level, defaulting to 2', () => {
		expect(
			body({
				content: [
					{ type: 'heading', attrs: { level: 3 }, content: [text('Drei')] },
					{ type: 'heading', content: [text('Zwei')] }
				]
			})
		).toBe('#heading(level: 3)[Drei]\n\n#heading(level: 2)[Zwei]');
	});

	test('renders bullet and ordered lists, with multi-paragraph and empty items', () => {
		const items = [
			{ type: 'listItem', content: [paragraph(text('a')), paragraph(text('b'))] },
			{ type: 'listItem' },
			{ type: 'listItem', content: [{ type: 'paragraph' }] }
		];
		expect(body({ content: [{ type: 'bulletList', content: items }] })).toBe(
			'#list([a\nb], [], [])'
		);
		expect(body({ content: [{ type: 'orderedList', content: items.slice(0, 1) }] })).toBe(
			'#enum([a\nb])'
		);
		expect(body({ content: [{ type: 'bulletList' }, { type: 'orderedList' }] })).toBe(
			'#list()\n\n#enum()'
		);
	});

	test('renders block quotes and stray list items', () => {
		expect(
			body({
				content: [
					{ type: 'blockquote', content: [paragraph(text('a')), paragraph(text('b'))] },
					{ type: 'blockquote' },
					{ type: 'listItem', content: [paragraph(text('c'))] }
				]
			})
		).toBe('#quote(block: true)[a\n\nb]\n\n#quote(block: true)[]\n\nc');
	});

	test('renders the children of unknown containers as blocks', () => {
		expect(
			body({
				content: [
					{
						type: 'section',
						content: [paragraph(text('a')), { type: 'paragraph' }, paragraph(text('b'))]
					},
					{ type: 'section' }
				]
			})
		).toBe('a\n\nb');
	});
});
