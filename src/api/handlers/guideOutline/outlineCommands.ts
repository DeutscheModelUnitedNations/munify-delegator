import type { Audience, Outline, OutlineSection, TemplateSlot } from '#lib/guide/outline';
import {
	addEntry,
	addSection,
	dropInTree,
	moveBlock,
	moveEntry,
	moveItem,
	outlineBlocks,
	removeEntry,
	removeSection,
	setTemplateEnabled,
	updateEntry,
	updateSection,
	updateSlots,
	type EntryAt
} from '#lib/guide/outlineEditing';

/**
 * The sidebar changes the API offers one by one (`addGuideSection`, `moveGuideEntry`, …): each
 * finds what it names by id, applies the workspace's change (`#lib/guide/outlineEditing`) and
 * answers the new outline, or what it could not find. Sections are named by id, entries by their
 * section and page: an index would point at another entry once someone else changed the list.
 * A page listed twice in one section is found as its first entry (readers' keys share that limit).
 */

export type Missing = 'section' | 'entry' | 'template' | 'slot';

export type CommandResult = { outline: Outline; sectionId?: string } | { missing: Missing };

/** A section or the committee template, as a block of the sidebar. */
export type BlockRef = { sectionId: string } | 'template';

const sectionIndexOf = ({ outline, sectionId }: { outline: Outline; sectionId: string }) =>
	outline.sections.findIndex((section) => section.id === sectionId);

/** Where the first entry for `pageId` in the section is, if the section has one. */
function entryAt({
	outline,
	sectionId,
	pageId
}: {
	outline: Outline;
	sectionId: string;
	pageId: string;
}): EntryAt | Missing {
	const section = sectionIndexOf({ outline, sectionId });
	if (section === -1) return 'section';
	const entry = outline.sections[section].entries.findIndex((item) => item.pageId === pageId);
	return entry === -1 ? 'entry' : { section, entry };
}

/** The block index (`outlineBlocks`) of a section or the template, -1 when it is not there. */
function blockIndexOf({ outline, block }: { outline: Outline; block: BlockRef }) {
	const section = block === 'template' ? -1 : sectionIndexOf({ outline, ...block });
	return outlineBlocks(outline).findIndex((candidate) =>
		candidate.kind === 'template'
			? block === 'template'
			: block !== 'template' && candidate.index === section
	);
}

const clamp = ({ value, max }: { value: number; max: number }) =>
	Math.min(Math.max(value, 0), Math.max(max, 0));

/** A section or the template moved to `position` among the blocks (past the end: last). */
export function moveBlockTo({
	outline,
	block,
	position
}: {
	outline: Outline;
	block: BlockRef;
	position: number;
}): CommandResult {
	const from = blockIndexOf({ outline, block });
	if (from === -1) return { missing: block === 'template' ? 'template' : 'section' };
	const last = outlineBlocks(outline).length - 1;
	return { outline: moveBlock({ outline, from, to: clamp({ value: position, max: last }) }) };
}

/** A new section, at the end or at `position` among the blocks; answers its id. */
export function addSectionAt({
	outline,
	title,
	audience,
	position
}: {
	outline: Outline;
	title: string;
	audience?: Audience;
	position?: number;
}): CommandResult {
	const added = addSection({ outline, title });
	const index = added.sections.length - 1;
	const sectionId = added.sections[index].id;
	const withAudience = audience
		? updateSection({ outline: added, index, change: (section) => ({ ...section, audience }) })
		: added;
	if (position === undefined) return { outline: withAudience, sectionId };
	const moved = moveBlockTo({ outline: withAudience, block: { sectionId }, position });
	return 'missing' in moved ? moved : { outline: moved.outline, sectionId };
}

/** A section with a new title or audience (what is not given stays). */
export function changeSection({
	outline,
	sectionId,
	title,
	audience
}: {
	outline: Outline;
	sectionId: string;
	title?: string;
	audience?: Audience;
}): CommandResult {
	const index = sectionIndexOf({ outline, sectionId });
	if (index === -1) return { missing: 'section' };
	return {
		outline: updateSection({
			outline,
			index,
			change: (section) => ({
				...section,
				...(title === undefined ? {} : { title }),
				...(audience === undefined ? {} : { audience })
			})
		})
	};
}

export function deleteSection({
	outline,
	sectionId
}: {
	outline: Outline;
	sectionId: string;
}): CommandResult {
	const index = sectionIndexOf({ outline, sectionId });
	if (index === -1) return { missing: 'section' };
	return { outline: removeSection({ outline, index }) };
}

type Entry = OutlineSection['entries'][number];

/** An entry for `pageId` in the section, at its end or before the entry at `position`. */
export function addEntryTo({
	outline,
	sectionId,
	pageId,
	position,
	label,
	audience
}: {
	outline: Outline;
	sectionId: string;
	pageId: string;
	position?: number;
	label?: string;
	audience?: Audience;
}): CommandResult {
	const section = sectionIndexOf({ outline, sectionId });
	if (section === -1) return { missing: 'section' };
	const length = outline.sections[section].entries.length;
	const at = position === undefined ? length : clamp({ value: position, max: length });
	const added = addEntry({ outline, section, pageId, label, at });
	if (!audience) return { outline: added };
	return {
		outline: updateEntry({
			outline: added,
			at: { section, entry: at },
			change: (entry) => ({ ...entry, audience })
		})
	};
}

/**
 * An entry with a new label or audience: `undefined` keeps it, `null` clears it (the page's own
 * title; the section's audience).
 */
export function changeEntry({
	outline,
	sectionId,
	pageId,
	label,
	audience
}: {
	outline: Outline;
	sectionId: string;
	pageId: string;
	label?: string | null;
	audience?: Audience | null;
}): CommandResult {
	const at = entryAt({ outline, sectionId, pageId });
	if (typeof at === 'string') return { missing: at };
	const apply = (entry: Entry): Entry => {
		const next: Entry = { ...entry };
		if (label === null || label === '') delete next.label;
		else if (label !== undefined) next.label = label;
		if (audience === null) delete next.audience;
		else if (audience !== undefined) next.audience = audience;
		return next;
	};
	return { outline: updateEntry({ outline, at, change: apply }) };
}

export function deleteEntry({
	outline,
	sectionId,
	pageId
}: {
	outline: Outline;
	sectionId: string;
	pageId: string;
}): CommandResult {
	const at = entryAt({ outline, sectionId, pageId });
	if (typeof at === 'string') return { missing: at };
	return { outline: removeEntry({ outline, at }) };
}

/**
 * An entry moved: within its section, into another, or into the committee template as a page
 * slot (keeping its label; an entry's own audience does not apply there). `position` is where it
 * stands once it left its place (past the end, or none: last).
 */
export function moveEntryTo({
	outline,
	from,
	to
}: {
	outline: Outline;
	from: { sectionId: string; pageId: string };
	to: { block: BlockRef; position?: number };
}): CommandResult {
	const at = entryAt({ outline, ...from });
	if (typeof at === 'string') return { missing: at };
	if (to.block === 'template') {
		const template = outline.committeeTemplate;
		if (!template) return { missing: 'template' };
		const index = to.position ?? template.slots.length;
		const drop =
			index >= template.slots.length
				? ({ type: 'templateEnd' } as const)
				: ({ type: 'slot', index: Math.max(index, 0) } as const);
		return { outline: dropInTree({ outline, drag: { type: 'entry', at }, drop }) };
	}
	const section = sectionIndexOf({ outline, sectionId: to.block.sectionId });
	if (section === -1) return { missing: 'section' };
	const entry = to.position ?? Number.MAX_SAFE_INTEGER;
	return { outline: moveEntry({ outline, from: at, to: { section, entry } }) };
}

/** The committee template switched on (with `slots`, if given) or off. */
export function setTemplate({
	outline,
	enabled,
	slots
}: {
	outline: Outline;
	enabled: boolean;
	slots?: TemplateSlot[];
}): CommandResult {
	const switched = setTemplateEnabled({ outline, enabled });
	if (!enabled || !slots) return { outline: switched };
	return { outline: updateSlots({ outline: switched, change: () => [...slots] }) };
}

/** A template slot moved from `from` to `to` (indexes; `to` past the end: last). */
export function moveSlot({
	outline,
	from,
	to
}: {
	outline: Outline;
	from: number;
	to: number;
}): CommandResult {
	const slots = outline.committeeTemplate?.slots;
	if (!slots) return { missing: 'template' };
	if (from < 0 || from >= slots.length) return { missing: 'slot' };
	const target = clamp({ value: to, max: slots.length - 1 });
	return {
		outline: updateSlots({
			outline,
			change: (list) => moveItem({ list, index: from, by: target - from })
		})
	};
}

/**
 * Whether the draft moved on since the writer saw it (`expected`, its `draftUpdatedAt`; a stamp
 * of a draft that does not exist counts as moved on). Without `expected` nothing is checked.
 */
export function draftChangedSinceSeen({
	stored,
	expected
}: {
	stored: Date | undefined;
	expected: Date | null | undefined;
}) {
	if (!expected) return false;
	return stored?.getTime() !== expected.getTime();
}
