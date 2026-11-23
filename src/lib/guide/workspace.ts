import type { GuidePageState } from './library';
import {
	outlinePageIds,
	parseOutline,
	type Audience,
	type GuideReader,
	type Outline,
	type TemplateCommittee,
	type TemplateSlot,
	type TopicReaders
} from './outline';
import { outlineBlocks } from './outlineEditing';

/**
 * What the team's guide workspace (`team/guide`) shows besides the tree: which pages wait to be
 * published, the committee matrix and who sees which section.
 */

/** A page reaching the conference, as the workspace knows it. */
export type WorkspacePage = {
	id: string;
	title: string;
	kind: 'GENERAL' | 'COMMITTEE' | 'AGENDA_ITEM';
	state: GuidePageState;
	committeeId?: string | null;
	agendaItemId?: string | null;
};

/** General pages the outline does not name, by title. */
export function pagesOutsideOutline({
	outline,
	pages,
	locale
}: {
	outline: Outline;
	pages: readonly WorkspacePage[];
	locale: string;
}) {
	const named = new Set(outlinePageIds(outline));
	return pages
		.filter((page) => page.kind === 'GENERAL' && !named.has(page.id))
		.toSorted((a, b) => a.title.localeCompare(b.title, locale));
}

/** Whether the draft differs from what is published (nothing published: always). */
export function outlineChanged({ draft, published }: { draft: Outline; published: unknown }) {
	if (published === null || published === undefined) return true;
	// both through the schema, so key order and dropped extras do not count as changes
	return JSON.stringify(parseOutline(draft)) !== JSON.stringify(parseOutline(published));
}

/**
 * The pages the guide uses that wait to be published (never published or changed since): those
 * the outline names, and with a template the committee and agenda item pages it fills in.
 */
export function pendingPages({
	outline,
	pages,
	locale
}: {
	outline: Outline;
	pages: readonly WorkspacePage[];
	locale: string;
}) {
	const named = new Set(outlinePageIds(outline));
	const slots = outline.committeeTemplate?.slots ?? [];
	// the topic overview lists every committee's page and its agenda items' pages
	const overview = Boolean(outline.topicOverview);
	const usesKind = {
		GENERAL: false,
		COMMITTEE: overview || slots.some((slot) => slot.type === 'committeePage'),
		AGENDA_ITEM: overview || slots.some((slot) => slot.type === 'agendaItemPages')
	};
	return pages
		.filter((page) => page.state !== 'PUBLISHED' && (named.has(page.id) || usesKind[page.kind]))
		.toSorted((a, b) => a.title.localeCompare(b.title, locale));
}

// --- Committee matrix -------------------------------------------------------------------------

export type MatrixCommittee = {
	id: string;
	name: string;
	abbreviation: string;
	/** In the agenda's order. */
	agendaItems: readonly { id: string; title: string }[];
};

export type MatrixCell =
	| { kind: 'page'; pageId: string; title: string; state: GuidePageState }
	| { kind: 'missing'; owner: { committeeId: string } | { agendaItemId: string }; title: string }
	| { kind: 'none' };

export type MatrixRow =
	| {
			kind: 'shared';
			key: string;
			label: string | null;
			page: { id: string; title: string; state: GuidePageState } | null;
	  }
	| { kind: 'committeePage'; key: string; label: string | null; cells: MatrixCell[] }
	| { kind: 'agendaItem'; key: string; number: number; cells: MatrixCell[] };

/** Without a template, a committee's own pages are its page and its agenda items' pages. */
const DEFAULT_SLOTS: TemplateSlot[] = [{ type: 'committeePage' }, { type: 'agendaItemPages' }];

const pageCell = (page: WorkspacePage | undefined, missing: () => MatrixCell): MatrixCell =>
	page ? { kind: 'page', pageId: page.id, title: page.title, state: page.state } : missing();

/**
 * The template as a matrix: a row per slot, the agenda item slot one row per agenda item number;
 * shared pages one cell for all committees, the committees' own pages one cell each.
 */
export function committeeMatrix({
	slots,
	committees,
	pages
}: {
	slots: readonly TemplateSlot[] | undefined;
	committees: readonly MatrixCommittee[];
	pages: readonly WorkspacePage[];
}): MatrixRow[] {
	const byId = new Map(pages.map((page) => [page.id, page]));
	const byCommittee = new Map(
		pages.flatMap((page) => (page.committeeId ? [[page.committeeId, page]] : []))
	);
	const byAgendaItem = new Map(
		pages.flatMap((page) => (page.agendaItemId ? [[page.agendaItemId, page]] : []))
	);
	const mostItems = Math.max(0, ...committees.map((committee) => committee.agendaItems.length));

	return (slots ?? DEFAULT_SLOTS).flatMap((slot, index): MatrixRow[] => {
		const key = `${slot.type}-${index}`;
		if (slot.type === 'page') {
			const page = byId.get(slot.pageId);
			return [
				{
					kind: 'shared',
					key,
					label: slot.label ?? null,
					page: page ? { id: page.id, title: page.title, state: page.state } : null
				}
			];
		}
		if (slot.type === 'committeePage') {
			return [
				{
					kind: 'committeePage',
					key,
					label: slot.label ?? null,
					cells: committees.map((committee) =>
						pageCell(byCommittee.get(committee.id), () => ({
							kind: 'missing',
							owner: { committeeId: committee.id },
							title: committee.name
						}))
					)
				}
			];
		}
		return Array.from({ length: mostItems }, (_, number) => ({
			kind: 'agendaItem' as const,
			key: `${key}-${number}`,
			number: number + 1,
			cells: committees.map((committee): MatrixCell => {
				const item = committee.agendaItems[number];
				if (!item) return { kind: 'none' };
				return pageCell(byAgendaItem.get(item.id), () => ({
					kind: 'missing',
					owner: { agendaItemId: item.id },
					title: item.title
				}));
			})
		}));
	});
}

/** Whether a matrix row still has something to do: a page missing or not published as it stands. */
export function rowIsOpen(row: MatrixRow) {
	if (row.kind === 'shared') return row.page?.state !== 'PUBLISHED';
	return row.cells.some(
		(cell) => cell.kind === 'missing' || (cell.kind === 'page' && cell.state !== 'PUBLISHED')
	);
}

/** Per committee (in the matrix's column order): how many of its own pages are published. */
export function committeeProgress(rows: readonly MatrixRow[], committees: number) {
	return Array.from({ length: committees }, (_, column) => {
		const cells = rows.flatMap((row) => (row.kind === 'shared' ? [] : [row.cells[column]]));
		const own = cells.filter((cell) => cell.kind !== 'none');
		return {
			published: own.filter((cell) => cell.kind === 'page' && cell.state === 'PUBLISHED').length,
			total: own.length
		};
	});
}

// --- Visibility -------------------------------------------------------------------------------

/** A group of readers: a column of the visibility table. */
export type ReaderGroup =
	| { type: 'delegates' }
	| { type: 'nonStateActors' }
	| { type: 'customRole'; roleId: string }
	| { type: 'supervisors' };

/** All of a section, some of its entries, the section of one's own committee, or nothing. */
export type Visibility = 'all' | 'some' | 'own' | 'none';

/** Whether `group` reads what is for `audience` (supervisors read everything). */
export function groupSees({ audience, group }: { audience: Audience; group: ReaderGroup }) {
	if (group.type === 'supervisors') return true;
	switch (audience.type) {
		case 'everyone':
			return true;
		case 'supervisors':
			return false;
		case 'delegates':
			return group.type === 'delegates';
		case 'nonStateActors':
			return group.type === 'nonStateActors';
		case 'customRoles':
			return group.type === 'customRole' && audience.roleIds.includes(group.roleId);
	}
}

export type VisibilityRow = {
	kind: 'section' | 'entry' | 'template' | 'topics';
	key: string;
	title: string;
	/** The section a section or entry row is about (to change who sees it). */
	section: number | null;
	cells: Visibility[];
};

/** Whether `group` reads the topic overview: what it names, never delegates. */
function groupReadsTopics({ readers, group }: { readers: TopicReaders; group: ReaderGroup }) {
	switch (group.type) {
		case 'delegates':
			return false;
		case 'nonStateActors':
			return readers.nonStateActors;
		case 'customRole':
			return readers.roleIds.includes(group.roleId);
		case 'supervisors':
			return readers.supervisors;
	}
}

/**
 * Who sees what: a row per section (the template's committee sections as one row, the topic
 * overview as one) and one per entry with its own audience, a cell per reader group.
 */
export function visibilityRows({
	outline,
	groups,
	titles
}: {
	outline: Outline;
	groups: readonly ReaderGroup[];
	/** The template row's title and a page's title for entries without their own. */
	titles: { template: string; page: (pageId: string) => string };
}): VisibilityRow[] {
	return outlineBlocks(outline).flatMap((block): VisibilityRow[] => {
		if (block.kind === 'topics') {
			const readers = outline.topicOverview?.readers;
			if (!readers) return [];
			return [
				{
					kind: 'topics',
					key: 'topics',
					title: outline.topicOverview?.title ?? '',
					section: null,
					cells: groups.map((group) => (groupReadsTopics({ readers, group }) ? 'all' : 'none'))
				}
			];
		}
		if (block.kind === 'template') {
			return [
				{
					kind: 'template',
					key: 'template',
					title: titles.template,
					section: null,
					cells: groups.map((group) =>
						group.type === 'supervisors' ? 'all' : group.type === 'delegates' ? 'own' : 'none'
					)
				}
			];
		}
		const section = outline.sections[block.index];
		const seesSection = (group: ReaderGroup) => groupSees({ audience: section.audience, group });
		const sectionRow: VisibilityRow = {
			kind: 'section',
			key: section.id,
			title: section.title,
			section: block.index,
			cells: groups.map((group) => {
				if (!seesSection(group)) return 'none';
				const hidden = section.entries.some(
					(entry) => entry.audience && !groupSees({ audience: entry.audience, group })
				);
				return hidden ? 'some' : 'all';
			})
		};
		const entryRows = section.entries.flatMap((entry, index): VisibilityRow[] => {
			const audience = entry.audience;
			if (!audience) return [];
			return [
				{
					kind: 'entry',
					key: `${section.id}~${index}`,
					title: entry.label || titles.page(entry.pageId),
					section: block.index,
					cells: groups.map((group) =>
						seesSection(group) && groupSees({ audience, group }) ? 'all' : 'none'
					)
				}
			];
		});
		return [sectionRow, ...entryRows];
	});
}

/** The reader a group's column previews: delegates as delegates of `committeeId`. */
export function readerOf({
	group,
	committeeId
}: {
	group: ReaderGroup;
	committeeId: string | null;
}): GuideReader {
	switch (group.type) {
		case 'delegates':
			return { kind: 'delegate', committeeId, nonStateActor: false };
		case 'nonStateActors':
			return { kind: 'delegate', committeeId: null, nonStateActor: true };
		case 'customRole':
			return { kind: 'singleParticipant', roleId: group.roleId };
		case 'supervisors':
			return { kind: 'supervisor' };
	}
}

/** The committees as the template expands them: with their own and their agenda items' pages. */
export function templateCommittees({
	committees,
	pages
}: {
	committees: readonly MatrixCommittee[];
	pages: readonly WorkspacePage[];
}): TemplateCommittee[] {
	const byCommittee = new Map(
		pages.flatMap((page) => (page.committeeId ? [[page.committeeId, page.id]] : []))
	);
	const byAgendaItem = new Map(
		pages.flatMap((page) => (page.agendaItemId ? [[page.agendaItemId, page.id]] : []))
	);
	return committees.map((committee) => ({
		id: committee.id,
		name: committee.name,
		pageId: byCommittee.get(committee.id) ?? null,
		agendaItemPageIds: committee.agendaItems.flatMap((item) => {
			const pageId = byAgendaItem.get(item.id);
			return pageId ? [pageId] : [];
		})
	}));
}
