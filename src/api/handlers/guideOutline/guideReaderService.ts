import { db } from '#api/db/db';
import { downloadUrl, downloadUrlOf } from '#api/handlers/storedFile/storedFileService';
import {
	expandOutline,
	guideForReader,
	locateEntry,
	withAvailablePages,
	type GuideEntry,
	type GuideReader,
	type GuideSection
} from '#lib/guide/outline';
import {
	fillPlaceholders,
	parseGuideDocument,
	referencedFileIds,
	type GuideDocument,
	type PlaceholderValues
} from '#lib/guide/document';
import { m } from '#lib/paraglide/messages';
import { hrefResolver, resolveDocument } from '#lib/guide/readerDocument';
import { GUIDE_FILE_PURPOSES, pageIdsReachingOf } from '../guidePage/guidePageService';
import { outlineOf } from './guideOutlineService';

/**
 * What a reader gets of a conference's guide (`docs/plans/guide.md`, "What a reader gets"): the
 * published sidebar, expanded and filtered for their part, with the pages that are published
 * there; or, for the team's preview, the drafts.
 */

type PageInGuide = {
	title: string;
	content: unknown;
	pdfFileId: string | null;
	at: Date;
	/** An agenda item page's points for discussion (live, not versioned); null on other pages. */
	discussionPoints: string[] | null;
};

async function committeesOf(conferenceId: string) {
	const committees = await db.query.committee.findMany({
		where: { conferenceId },
		columns: { id: true, name: true },
		orderBy: { createdAt: 'asc' },
		with: {
			agendaItems: { columns: { id: true, title: true }, orderBy: { createdAt: 'asc' } }
		}
	});
	const owned = await db.query.guidePage.findMany({
		where: {
			OR: [
				{ committeeId: { in: committees.map((committee) => committee.id) } },
				{
					agendaItemId: {
						in: committees.flatMap((committee) => committee.agendaItems.map((item) => item.id))
					}
				}
			]
		},
		columns: { id: true, committeeId: true, agendaItemId: true }
	});
	const byCommittee = new Map(owned.map((page) => [page.committeeId, page.id]));
	const byAgendaItem = new Map(owned.map((page) => [page.agendaItemId, page.id]));
	return committees.map((committee) => ({
		id: committee.id,
		name: committee.name,
		agendaItems: committee.agendaItems.map((item) => item.title),
		pageId: byCommittee.get(committee.id) ?? null,
		agendaItemPageIds: committee.agendaItems.flatMap((item) => {
			const id = byAgendaItem.get(item.id);
			return id ? [id] : [];
		})
	}));
}

/** The pages of `ids` as the reader reads them: the published versions, or the drafts. */
async function pagesFor({
	ids,
	draft
}: {
	ids: readonly string[];
	draft: boolean;
}): Promise<Map<string, PageInGuide>> {
	if (ids.length === 0) return new Map();
	const pages = await db.query.guidePage.findMany({
		where: { id: { in: [...ids] } },
		columns: { id: true, title: true, content: true, draftUpdatedAt: true },
		with: {
			agendaItem: { columns: { discussionPoints: true } },
			publishedVersion: {
				columns: { title: true, content: true, pdfFileId: true, createdAt: true }
			}
		}
	});
	return new Map(
		pages.flatMap((page): [string, PageInGuide][] => {
			const discussionPoints = page.agendaItem?.discussionPoints ?? null;
			if (draft) {
				return [
					[
						page.id,
						{
							title: page.title,
							content: page.content,
							pdfFileId: page.publishedVersion?.pdfFileId ?? null,
							at: page.draftUpdatedAt,
							discussionPoints
						}
					]
				];
			}
			const version = page.publishedVersion;
			return version
				? [
						[
							page.id,
							{
								title: version.title,
								content: version.content,
								pdfFileId: version.pdfFileId,
								at: version.createdAt,
								discussionPoints
							}
						]
					]
				: [];
		})
	);
}

export type ReaderGuide = Awaited<ReturnType<typeof guideFor>>;

/**
 * The reader's guide of the conference: their sections with the entries whose page is there for
 * them (published and reaching the conference; for a `draft` preview, the drafts reaching it).
 */
export async function guideFor({
	conferenceId,
	reader,
	draft
}: {
	conferenceId: string;
	reader: GuideReader;
	draft: boolean;
}) {
	const [outline, committees, conference] = await Promise.all([
		outlineOf({ conferenceId, draft }),
		committeesOf(conferenceId),
		db.query.conference.findFirst({ where: { id: conferenceId }, columns: { title: true } })
	]);
	const expanded = guideForReader({ sections: expandOutline({ outline, committees }), reader });
	const named = [...new Set(expanded.flatMap((section) => section.entries.map((e) => e.pageId)))];
	const there = new Set(
		await pageIdsReachingOf({ conferenceId, pageIds: named, as: draft ? 'draft' : 'published' })
	);
	const sections = withAvailablePages({ sections: expanded, isAvailable: (id) => there.has(id) });
	const pages = await pagesFor({ ids: [...there], draft });
	return {
		conferenceTitle: conference?.title ?? '',
		sections,
		pages,
		committees: new Map(committees.map((committee) => [committee.id, committee]))
	};
}

/** An entry with the title the reader sees: its label, or the page's title. */
function titledEntry({ entry, guide }: { entry: GuideEntry; guide: ReaderGuide }) {
	return {
		key: entry.key,
		pageId: entry.pageId,
		indent: entry.indent,
		title: entry.label ?? guide.pages.get(entry.pageId)?.title ?? ''
	};
}

/** The sections with titled entries, for the sidebar. */
export function titledSections(guide: ReaderGuide) {
	return guide.sections.map((section: GuideSection) => ({
		key: section.key,
		title: section.title,
		entries: section.entries.map((entry) => titledEntry({ entry, guide }))
	}));
}

/** Presigned URLs of the guide files a document names, by file id. */
async function fileUrls(doc: GuideDocument) {
	const ids = referencedFileIds(doc);
	if (ids.length === 0) return new Map<string, string>();
	const files = await db.query.storedFile.findMany({
		where: { id: { in: ids }, purpose: { in: [...GUIDE_FILE_PURPOSES] } },
		columns: { id: true, key: true, fileName: true }
	});
	return new Map(
		await Promise.all(files.map(async (file) => [file.id, await downloadUrl(file)] as const))
	);
}

/**
 * The document as a reader gets it: placeholders filled, files as download URLs, links to pages
 * outside their guide as plain text, headings with the anchors of the table of contents.
 */
async function resolveForReader({
	doc,
	inGuide,
	values
}: {
	doc: GuideDocument;
	inGuide: (pageId: string) => boolean;
	values: PlaceholderValues;
}) {
	const filled = fillPlaceholders(doc, values);
	const urls = await fileUrls(filled);
	return resolveDocument({ doc: filled, resolve: hrefResolver({ urls, inGuide }) });
}

/** What fills a page's placeholders in the section it was opened in. */
function placeholderValues({
	guide,
	committeeId,
	discussionPoints
}: {
	guide: ReaderGuide;
	committeeId: string | null;
	discussionPoints: string[] | null;
}): PlaceholderValues {
	const committee = committeeId ? guide.committees.get(committeeId) : undefined;
	return {
		conference: guide.conferenceTitle,
		committee: committee && { name: committee.name, agendaItems: committee.agendaItems },
		discussionPoints: discussionPoints
			? { heading: m.discussionPoints(), points: discussionPoints }
			: undefined
	};
}

/**
 * One page of the reader's guide, with its place in it (previous and next), or undefined when it
 * is not in their guide.
 */
export async function readerPage({
	guide,
	pageId,
	entryKey
}: {
	guide: ReaderGuide;
	pageId: string;
	entryKey?: string | null;
}) {
	const located = locateEntry({ sections: guide.sections, pageId, key: entryKey });
	const page = guide.pages.get(pageId);
	if (!located || !page) return undefined;
	const inGuide = new Set(guide.sections.flatMap((s) => s.entries.map((e) => e.pageId)));
	const { content, headings } = await resolveForReader({
		doc: parseGuideDocument(page.content),
		inGuide: (id) => inGuide.has(id),
		// in the topic overview each page names its own committee
		values: placeholderValues({
			guide,
			committeeId: located.entry.committeeId ?? located.section.committeeId,
			discussionPoints: page.discussionPoints
		})
	});
	return {
		pageId,
		entryKey: located.entry.key,
		title: located.entry.label ?? page.title,
		sectionTitle: located.section.title,
		content,
		headings: headings.map(({ id, level, text }) => ({ anchor: id, level, text })),
		previous: located.previous && titledEntry({ entry: located.previous, guide }),
		next: located.next && titledEntry({ entry: located.next, guide }),
		pdfUrl: await downloadUrlOf(page.pdfFileId),
		updatedAt: page.at
	};
}
