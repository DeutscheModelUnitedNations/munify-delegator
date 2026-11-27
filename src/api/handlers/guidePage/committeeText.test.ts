import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GraphQLError } from 'graphql';
import { logger } from '#lib/logger';
import type { GuideDocument } from '#lib/guide/document';
import { publishedCommitteeText, renderCommitteeText } from './committeeText';

const { findFirst, findPage, writeTypstImage, typstBrandingOf, compileTypst, storeGeneratedFile } =
	vi.hoisted(() => ({
		findFirst: vi.fn(),
		findPage: vi.fn(),
		writeTypstImage: vi.fn(),
		typstBrandingOf: vi.fn(),
		compileTypst: vi.fn(),
		storeGeneratedFile: vi.fn()
	}));
vi.mock('#api/db/db', () => ({
	db: { query: { committeeAgendaItem: { findFirst }, guidePage: { findFirst: findPage } } }
}));
vi.mock('#api/services/typstBranding', () => ({ writeTypstImage, typstBrandingOf }));
vi.mock('#api/services/typst', () => ({ compileTypst }));
vi.mock('../storedFile/storedFileService', () => ({ storeGeneratedFile }));

const content: GuideDocument = {
	type: 'doc',
	content: [
		{ type: 'paragraph', content: [{ type: 'text', text: 'Willkommen bei {{Konferenz}}' }] },
		{ type: 'image', attrs: { src: 'file:img1' } },
		{ type: 'image', attrs: { src: 'file:gone' } }
	]
};

const page = { id: 'p1', title: 'Klima', content, agendaItemId: 'a1' };

const agendaItem = {
	title: 'Klima',
	discussionPoints: ['Wie wird Klimaschutz finanziert?'],
	committee: {
		name: 'Sicherheitsrat',
		abbreviation: 'SR',
		conference: { id: 'c1', title: 'MUN-SH 2027' },
		agendaItems: [{ title: 'Klima' }]
	}
};

/** The Typst source the last render compiled. */
const compiledSource = (): string => compileTypst.mock.calls.at(-1)?.[0].source ?? '';

beforeEach(() => {
	vi.clearAllMocks();
	findFirst.mockResolvedValue(agendaItem);
	writeTypstImage.mockImplementation(({ fileId, name }: { fileId: string; name: string }) =>
		Promise.resolve(fileId === 'img1' ? `${name}.png` : undefined)
	);
	compileTypst.mockResolvedValue(Buffer.from('%PDF'));
	storeGeneratedFile.mockResolvedValue('file-id');
});

describe('renderCommitteeText', () => {
	test('answers nothing for an agenda item that is gone', async () => {
		findFirst.mockResolvedValue(undefined);
		expect(await renderCommitteeText(page)).toBeNull();
		expect(compileTypst).not.toHaveBeenCalled();
	});

	test('renders the page in the conference branding and stores the PDF', async () => {
		typstBrandingOf.mockResolvedValue({
			conferenceName: 'MUN-SH 2027',
			brand: 'mun-sh',
			lang: 'en',
			logo: { path: 'mun-sh-lang.svg', darkPath: 'mun-sh-lang-darkmode.svg', clearSpace: true }
		});
		expect(await renderCommitteeText(page)).toBe('file-id');

		const source = compiledSource();
		// placeholders are filled, readable images are placed, missing ones left out
		expect(source).toContain('Willkommen bei MUN\\-SH 2027');
		expect(source).toContain('image("image-0.png"');
		expect(source).not.toContain('gone');
		expect(source).toContain('rgb("#C81111")');
		expect(source).toContain('lang: "en"');
		expect(source).toContain('mun-sh-lang-darkmode.svg');
		expect(source).toContain('Sicherheitsrat (SR)');
		// the points for discussion go below the title, in a box with a DMUN-Blau rule
		expect(source).toContain('Punkte zur Diskussion');
		expect(source).toContain('Wie wird Klimaschutz finanziert?');
		expect(source.indexOf('Punkte zur Diskussion')).toBeLessThan(source.indexOf('Willkommen'));
		expect(source).toContain('stroke: (left: 4pt + dmun-blue)');
		expect(storeGeneratedFile).toHaveBeenCalledWith(
			expect.objectContaining({
				conferenceId: 'c1',
				purpose: 'guide/committeeText',
				fileName: 'SR - Klima.pdf',
				mimeType: 'application/pdf'
			})
		);
	});

	test('falls back to DMUN in German without a branding', async () => {
		typstBrandingOf.mockResolvedValue(undefined);
		await renderCommitteeText(page);
		const source = compiledSource();
		expect(source).toContain('rgb("#6D9392")');
		expect(source).toContain('lang: "de"');
		expect(source).not.toContain('svg"');
	});

	test('refuses the publish when Typst fails, and logs why', async () => {
		typstBrandingOf.mockResolvedValue(undefined);
		compileTypst.mockRejectedValue(new Error('unknown variable'));
		const warn = vi.spyOn(logger, 'warn');
		const error = await renderCommitteeText(page).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(GraphQLError);
		expect(error).toMatchObject({ extensions: { code: 'INVALID_INPUT' } });
		expect(warn).toHaveBeenCalledWith('Rendering a committee text failed', {
			pageId: 'p1',
			error: 'Error: unknown variable'
		});
		expect(storeGeneratedFile).not.toHaveBeenCalled();
	});
});

describe('publishedCommitteeText', () => {
	const committee = {
		name: 'Sicherheitsrat',
		conference: { title: 'MUN-SH 2027' },
		agendaItems: [{ title: 'Klima' }, { title: 'Frieden' }]
	};

	test('answers nothing while no version is published', async () => {
		findPage.mockResolvedValue({ id: 'p1', publishedVersion: null, agendaItem: { committee } });
		expect(await publishedCommitteeText('a1')).toBeNull();
		findPage.mockResolvedValue(undefined);
		expect(await publishedCommitteeText('a1')).toBeNull();
	});

	test('gives the published version as Markdown, placeholders filled but the points left', async () => {
		const createdAt = new Date('2027-01-01T00:00:00Z');
		findPage.mockResolvedValue({
			id: 'p1',
			publishedVersion: {
				title: 'Klima',
				number: 3,
				createdAt,
				pdfFileId: 'pdf1',
				content: {
					type: 'doc',
					content: [
						{ type: 'paragraph', content: [{ type: 'text', text: 'Im {{Gremium}}: {{Themen}}' }] },
						{ type: 'paragraph', content: [{ type: 'text', text: '{{Diskussionspunkte}}' }] }
					]
				}
			},
			agendaItem: { committee }
		});
		expect(await publishedCommitteeText('a1')).toEqual({
			pageId: 'p1',
			title: 'Klima',
			versionNumber: 3,
			publishedAt: createdAt,
			pdfFileId: 'pdf1',
			markdown: 'Im Sicherheitsrat: Klima, Frieden\n\n{{Diskussionspunkte}}',
			omittedBlocks: []
		});
	});
});
