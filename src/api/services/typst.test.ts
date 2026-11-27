import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { committeeTextToTypst } from '#lib/guide/guideTypst';
import { paperToTypst } from '#lib/helpers/paperTypst';
import { compileTypst, typstFontArgs } from './typst';

/**
 * The templates compiled by the real compiler with the shipped fonts: a template that stops
 * compiling, or a font that is no longer found, fails here and not when someone exports.
 */

const logo =
	'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#01548F"/></svg>';

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const longText =
	'Strom, Wasser und Zahlungsverkehr hängen an digitalen Netzen – „Angriffe“ treffen die Versorgung. - = // + # * _';

let dir: string;
beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'typst-test-'));
	await writeFile(join(dir, 'logo.svg'), logo);
});
afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

/** The PDF's bytes as Latin-1 text, to look for the names of embedded fonts. */
const pdfText = (pdf: Buffer) => pdf.toString('latin1');

describe('typstFontArgs', () => {
	test('points the compiler at the fonts of the checkout', () => {
		expect(typstFontArgs()).toEqual(['--font-path', join(process.cwd(), 'typst-fonts')]);
	});

	test('passes nothing where the folder is missing', () => {
		expect(typstFontArgs('/nonexistent')).toEqual([]);
	});
});

describe('templates', () => {
	test('a paper of several pages compiles in Outfit', { timeout: 30_000 }, async () => {
		const source = paperToTypst({
			content: {
				type: 'doc',
				content: [
					{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Lage' }] },
					...Array.from({ length: 30 }, () => paragraph(longText)),
					{ type: 'blockquote', content: [paragraph('Zitat')] },
					{
						type: 'orderedList',
						content: [{ type: 'listItem', content: [paragraph('eins')] }]
					}
				]
			},
			meta: {
				paperType: 'Positionspapier',
				entityName: 'Kenia',
				committeeLine: 'Sicherheitsrat (SR)',
				committeeLabel: 'Gremium',
				topic: 'Cyberraum',
				topicLabel: 'Thema',
				disclaimer: 'Simulation',
				documentNumber: 'PP-2027-ABCDEF'
			},
			branding: { conferenceName: 'MUN-SH 2027', brand: 'mun-sh', lang: 'de', logoPath: 'logo.svg' }
		});
		const pdf = await compileTypst({ dir, source });
		expect(pdfText(pdf).startsWith('%PDF')).toBe(true);
		expect(pdfText(pdf)).toContain('Outfit');
	});

	test('a committee text compiles in Outfit', { timeout: 30_000 }, async () => {
		const source = committeeTextToTypst({
			doc: {
				type: 'doc',
				content: [
					paragraph(longText),
					{ type: 'callout', attrs: { color: 'warning' }, content: [paragraph('Achtung')] },
					{ type: 'toggle', attrs: { summary: 'Mehr' }, content: [paragraph('Inhalt')] }
				]
			},
			images: new Map(),
			header: {
				conference: 'MUNBW 2027',
				committee: 'Generalversammlung (GV)',
				agendaItem: 'Schutz kritischer Infrastruktur im Cyberraum',
				agendaItemLabel: 'Thema',
				logoPath: 'logo.svg',
				brand: 'munbw',
				lang: 'de'
			}
		});
		const pdf = await compileTypst({ dir, source });
		expect(pdfText(pdf)).toContain('Outfit');
	});
});
