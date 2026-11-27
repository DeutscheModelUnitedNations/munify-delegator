import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { GuideDocument } from '#lib/guide/document';
import { guideFor, readerPage } from './guideReaderService';

const { committees, pages, outlineOf, pageIdsReachingOf } = vi.hoisted(() => ({
	committees: vi.fn(),
	pages: vi.fn(),
	outlineOf: vi.fn(),
	pageIdsReachingOf: vi.fn()
}));

vi.mock('#api/db/db', () => ({
	db: {
		query: {
			committee: { findMany: committees },
			guidePage: { findMany: pages },
			conference: { findFirst: () => Promise.resolve({ title: 'MUN-SH 2027' }) },
			storedFile: { findMany: () => Promise.resolve([]) }
		}
	}
}));
vi.mock('./guideOutlineService', () => ({ outlineOf }));
vi.mock('../guidePage/guidePageService', () => ({
	GUIDE_FILE_PURPOSES: ['guide/file', 'guide/committeeText'],
	pageIdsReachingOf
}));
vi.mock('#api/handlers/storedFile/storedFileService', () => ({
	downloadUrl: () => Promise.resolve('https://files/x'),
	downloadUrlOf: (id: string | null) => Promise.resolve(id ? `https://files/${id}` : null)
}));

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...content: ReturnType<typeof paragraph>[]): GuideDocument => ({
	type: 'doc',
	content
});

const POINTS = ['Wer finanziert es?', 'Wer setzt es um?'];

/** A committee with one agenda item, whose page names the points with the placeholder. */
function seed({ withPoints = true }: { withPoints?: boolean } = {}) {
	committees.mockResolvedValue([
		{ id: 'k1', name: 'Sicherheitsrat', agendaItems: [{ id: 'a1', title: 'Wasser' }] }
	]);
	pages.mockImplementation((args: { with?: unknown }) =>
		Promise.resolve(
			args.with
				? // the pages a reader reads
					[
						{
							id: 'p1',
							title: 'Wasser (Entwurf)',
							content: doc(paragraph('Neu.'), paragraph('{{Diskussionspunkte}}')),
							draftUpdatedAt: new Date('2027-01-02'),
							agendaItem: { discussionPoints: withPoints ? POINTS : [] },
							publishedVersion: {
								title: 'Wasser',
								content: doc(paragraph('Im {{Gremium}}.'), paragraph('{{Diskussionspunkte}}')),
								pdfFileId: 'pdf1',
								createdAt: new Date('2027-01-01')
							}
						},
						{
							id: 'p2',
							title: 'Allgemein',
							content: doc(paragraph('{{Diskussionspunkte}}')),
							draftUpdatedAt: new Date('2027-01-02'),
							agendaItem: null,
							publishedVersion: null
						}
					]
				: // the pages committees and agenda items own
					[{ id: 'p1', committeeId: null, agendaItemId: 'a1' }]
		)
	);
	outlineOf.mockResolvedValue({
		sections: [
			{ id: 's', title: 'Start', audience: { type: 'everyone' }, entries: [{ pageId: 'p2' }] }
		],
		committeeTemplate: {
			position: 1,
			titleFormat: 'COMMITTEE_NAME',
			slots: [{ type: 'agendaItemPages' }]
		}
	});
	pageIdsReachingOf.mockImplementation(({ pageIds }: { pageIds: string[] }) =>
		Promise.resolve(pageIds)
	);
}

const read = async ({ draft, pageId }: { draft: boolean; pageId: string }) =>
	readerPage({
		guide: await guideFor({ conferenceId: 'c1', reader: { kind: 'everything' }, draft }),
		pageId
	});

beforeEach(() => {
	vi.clearAllMocks();
	seed();
});

describe('readerPage', () => {
	test('fills the published agenda item page: committee, points as their box, PDF', async () => {
		const page = await read({ draft: false, pageId: 'p1' });
		expect(page?.title).toBe('Wasser');
		expect(page?.content.content?.[0].content?.[0].text).toBe('Im Sicherheitsrat.');
		expect(page?.content.content?.[1]).toMatchObject({
			type: 'discussionPoints',
			attrs: { points: POINTS, id: 'punkte-zur-diskussion' }
		});
		expect(page?.headings).toEqual([
			{ anchor: 'punkte-zur-diskussion', level: 2, text: 'Punkte zur Diskussion' }
		]);
		expect(page?.pdfUrl).toBe('https://files/pdf1');
		expect(page?.updatedAt).toEqual(new Date('2027-01-01'));
	});

	test('a preview reads the draft, with the points as they are now', async () => {
		const page = await read({ draft: true, pageId: 'p1' });
		expect(page?.title).toBe('Wasser (Entwurf)');
		expect(page?.content.content?.[1]).toMatchObject({ type: 'discussionPoints' });
		expect(page?.updatedAt).toEqual(new Date('2027-01-02'));
	});

	test('without points the placeholder leaves nothing behind', async () => {
		seed({ withPoints: false });
		const page = await read({ draft: false, pageId: 'p1' });
		expect(page?.content.content?.map((node) => node.type)).toEqual(['paragraph']);
	});

	test('a page that is no agenda item page keeps the placeholder', async () => {
		const page = await read({ draft: true, pageId: 'p2' });
		expect(page?.content.content?.[0].content?.[0].text).toBe('{{Diskussionspunkte}}');
	});

	test('a page that is not published is not in the guide', async () => {
		expect(await read({ draft: false, pageId: 'p2' })).toBeUndefined();
		expect(await read({ draft: false, pageId: 'gone' })).toBeUndefined();
	});
});
