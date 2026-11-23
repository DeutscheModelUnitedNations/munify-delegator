import type { Audience, AudienceType, Outline, OutlineSection, TemplateSlot } from './outline';

/**
 * Changes to a sidebar draft as the team's workspace (`team/guide`) makes them: each returns a new
 * outline and leaves the one given alone.
 */

/** `list` with the item at `index` moved by `by` places; unchanged when it would leave the list. */
export function moveItem<T>({
	list,
	index,
	by
}: {
	list: readonly T[];
	index: number;
	by: number;
}) {
	const target = index + by;
	if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list];
	const moved = [...list];
	const [item] = moved.splice(index, 1);
	moved.splice(target, 0, item);
	return moved;
}

/** The audience of `type`; custom roles keep the roles they had, or start with `roleIds`. */
export function audienceOf({
	type,
	current,
	roleIds = []
}: {
	type: AudienceType;
	current?: Audience;
	roleIds?: readonly string[];
}): Audience {
	if (type !== 'customRoles') return { type };
	const kept = current?.type === 'customRoles' ? current.roleIds : roleIds;
	return { type, roleIds: [...kept] };
}

/** A section id not used yet in the outline. */
export function newSectionId(outline: Outline) {
	const used = new Set(outline.sections.map((section) => section.id));
	let index = outline.sections.length + 1;
	while (used.has(`section-${index}`)) index += 1;
	return `section-${index}`;
}

/** The outline with `section` changed by `change`. */
export function updateSection({
	outline,
	index,
	change
}: {
	outline: Outline;
	index: number;
	change: (section: OutlineSection) => OutlineSection;
}): Outline {
	return {
		...outline,
		sections: outline.sections.map((section, at) => (at === index ? change(section) : section))
	};
}

/** The outline with a new empty section at the end. */
export function addSection({ outline, title }: { outline: Outline; title: string }): Outline {
	return {
		...outline,
		sections: [
			...outline.sections,
			{ id: newSectionId(outline), title, audience: { type: 'everyone' }, entries: [] }
		]
	};
}

/**
 * The outline without the section at `index`; the committee template keeps its place among the
 * remaining sections.
 */
export function removeSection({ outline, index }: { outline: Outline; index: number }): Outline {
	const template = outline.committeeTemplate;
	return {
		...outline,
		sections: outline.sections.filter((_, at) => at !== index),
		...(template
			? {
					committeeTemplate: {
						...template,
						position: template.position > index ? template.position - 1 : template.position
					}
				}
			: {})
	};
}

/** The outline with a committee template (empty, after the first section) or without one. */
export function setTemplateEnabled({
	outline,
	enabled
}: {
	outline: Outline;
	enabled: boolean;
}): Outline {
	if (!enabled) {
		const { committeeTemplate: _dropped, ...rest } = outline;
		return rest;
	}
	if (outline.committeeTemplate) return outline;
	const slots: TemplateSlot[] = [{ type: 'committeePage' }, { type: 'agendaItemPages' }];
	return {
		...outline,
		committeeTemplate: {
			position: Math.min(1, outline.sections.length),
			titleFormat: 'COMMITTEE_NAME',
			slots
		}
	};
}

/** Whether the outline names a page that is missing from `available` (not reaching the conference). */
export function missingPages({
	outline,
	available
}: {
	outline: Outline;
	available: ReadonlySet<string>;
}) {
	const named = [
		...outline.sections.flatMap((section) => section.entries.map((entry) => entry.pageId)),
		...(outline.committeeTemplate?.slots ?? []).flatMap((slot) =>
			slot.type === 'page' ? [slot.pageId] : []
		)
	];
	return [...new Set(named.filter((pageId) => !available.has(pageId)))];
}

/** A custom-role audience with `roleId` added or taken out; it keeps at least one role. */
export function toggleRole({
	audience,
	roleId,
	on
}: {
	audience: Audience | undefined;
	roleId: string;
	on: boolean;
}): Audience | undefined {
	if (audience?.type !== 'customRoles') return audience;
	const roleIds = on
		? [...new Set([...audience.roleIds, roleId])]
		: audience.roleIds.filter((id) => id !== roleId);
	return roleIds.length > 0 ? { type: 'customRoles', roleIds } : audience;
}

/** A new template slot of `type`; a page slot starts with `firstPageId`. */
export function newSlot({
	type,
	firstPageId
}: {
	type: TemplateSlot['type'];
	firstPageId: string;
}): TemplateSlot {
	return type === 'page' ? { type, pageId: firstPageId } : { type };
}

// --- The workspace tree (`team/guide`) ----------------------------------------------------------

/**
 * One block of the tree, in the order the sidebar shows them: the sections, with the committee
 * template standing where its committee sections go.
 */
export type OutlineBlock = { kind: 'section'; index: number } | { kind: 'template' };

export function outlineBlocks(outline: Outline): OutlineBlock[] {
	const blocks: OutlineBlock[] = outline.sections.map((_, index) => ({ kind: 'section', index }));
	const template = outline.committeeTemplate;
	if (template) blocks.splice(Math.min(template.position, blocks.length), 0, { kind: 'template' });
	return blocks;
}

/** The outline with the block at `from` moved to `to` (indexes into `outlineBlocks`). */
export function moveBlock({ outline, from, to }: { outline: Outline; from: number; to: number }) {
	const blocks = outlineBlocks(outline);
	if (from < 0 || from >= blocks.length || to < 0 || to >= blocks.length || from === to) {
		return outline;
	}
	const [moved] = blocks.splice(from, 1);
	blocks.splice(to, 0, moved);
	const sections = blocks.flatMap((block) =>
		block.kind === 'section' ? [outline.sections[block.index]] : []
	);
	const template = outline.committeeTemplate;
	if (!template) return { ...outline, sections };
	const position = blocks.findIndex((block) => block.kind === 'template');
	return { ...outline, sections, committeeTemplate: { ...template, position } };
}

/** Where an entry is: its section's index and its own. */
export type EntryAt = { section: number; entry: number };

/** The outline with the section at `section` given new entries. */
function withEntries({
	outline,
	section,
	change
}: {
	outline: Outline;
	section: number;
	change: (entries: OutlineSection['entries']) => OutlineSection['entries'];
}): Outline {
	return updateSection({
		outline,
		index: section,
		change: (current) => ({ ...current, entries: change(current.entries) })
	});
}

/** The outline with an entry for `pageId` in `section`, at `at` (default: the end). */
export function addEntry({
	outline,
	section,
	pageId,
	label,
	at
}: {
	outline: Outline;
	section: number;
	pageId: string;
	label?: string;
	at?: number;
}): Outline {
	return withEntries({
		outline,
		section,
		change: (entries) => {
			const next = [...entries];
			next.splice(at ?? next.length, 0, label ? { pageId, label } : { pageId });
			return next;
		}
	});
}

export function removeEntry({ outline, at }: { outline: Outline; at: EntryAt }): Outline {
	return withEntries({
		outline,
		section: at.section,
		change: (entries) => entries.filter((_, index) => index !== at.entry)
	});
}

export function updateEntry({
	outline,
	at,
	change
}: {
	outline: Outline;
	at: EntryAt;
	change: (entry: OutlineSection['entries'][number]) => OutlineSection['entries'][number];
}): Outline {
	return withEntries({
		outline,
		section: at.section,
		change: (entries) => entries.map((entry, index) => (index === at.entry ? change(entry) : entry))
	});
}

/**
 * The outline with the entry at `from` moved to `to`: into another section or within its own,
 * standing before the entry that is at `to.entry` once it left (`to.entry` past the end: last).
 */
export function moveEntry({ outline, from, to }: { outline: Outline; from: EntryAt; to: EntryAt }) {
	const entry = outline.sections[from.section]?.entries[from.entry];
	if (!entry || !outline.sections[to.section]) return outline;
	const without = removeEntry({ outline, at: from });
	return withEntries({
		outline: without,
		section: to.section,
		change: (entries) => {
			const next = [...entries];
			next.splice(Math.min(Math.max(to.entry, 0), next.length), 0, entry);
			return next;
		}
	});
}

/** Every place the outline names `pageId` as an entry. */
export function entriesOfPage({ outline, pageId }: { outline: Outline; pageId: string }) {
	return outline.sections.flatMap((section, sectionIndex) =>
		section.entries.flatMap((entry, entryIndex) =>
			entry.pageId === pageId ? [{ section: sectionIndex, entry: entryIndex }] : []
		)
	);
}

/** The outline with the template's slots changed; unchanged without a template. */
export function updateSlots({
	outline,
	change
}: {
	outline: Outline;
	change: (slots: TemplateSlot[]) => TemplateSlot[];
}): Outline {
	const template = outline.committeeTemplate;
	if (!template) return outline;
	return { ...outline, committeeTemplate: { ...template, slots: change([...template.slots]) } };
}

// --- Dragging in the tree ----------------------------------------------------------------------

/** What is being dragged: an entry, a template slot, a page not in the guide yet, or a block. */
export type TreeDrag =
	| { type: 'entry'; at: EntryAt }
	| { type: 'slot'; index: number }
	| { type: 'page'; pageId: string }
	| { type: 'block'; index: number };

/**
 * Where it is dropped: before an entry or a slot, at the end of a section or of the template, or
 * onto a block's heading (blocks only).
 */
export type TreeDrop =
	| { type: 'entry'; at: EntryAt }
	| { type: 'sectionEnd'; section: number }
	| { type: 'slot'; index: number }
	| { type: 'templateEnd' }
	| { type: 'block'; index: number };

/** The page and label a dragged entry, slot or page carries, if it carries one. */
function draggedPage({ outline, drag }: { outline: Outline; drag: TreeDrag }) {
	if (drag.type === 'page') return { pageId: drag.pageId, label: undefined };
	if (drag.type === 'entry') {
		const entry = outline.sections[drag.at.section]?.entries[drag.at.entry];
		return entry && { pageId: entry.pageId, label: entry.label };
	}
	if (drag.type === 'slot') {
		const slot = outline.committeeTemplate?.slots[drag.index];
		return slot?.type === 'page' ? { pageId: slot.pageId, label: slot.label } : undefined;
	}
	return undefined;
}

/** The outline without where the drag came from (a page from outside the guide leaves nothing). */
function withoutSource({ outline, drag }: { outline: Outline; drag: TreeDrag }): Outline {
	if (drag.type === 'entry') return removeEntry({ outline, at: drag.at });
	if (drag.type === 'slot') {
		return updateSlots({
			outline,
			change: (slots) => slots.filter((_, index) => index !== drag.index)
		});
	}
	return outline;
}

/** An index after taking out the item at `removed` of the same list (`-1`: nothing removed). */
const shifted = ({ index, removed }: { index: number; removed: number }) =>
	removed !== -1 && removed < index ? index - 1 : index;

function dropIntoSection({
	outline,
	drag,
	section,
	entry
}: {
	outline: Outline;
	drag: TreeDrag;
	section: number;
	entry: number;
}): Outline {
	if (drag.type === 'entry') return moveEntry({ outline, from: drag.at, to: { section, entry } });
	const page = draggedPage({ outline, drag });
	if (!page) return outline;
	return addEntry({ outline: withoutSource({ outline, drag }), section, at: entry, ...page });
}

function dropIntoTemplate({
	outline,
	drag,
	index
}: {
	outline: Outline;
	drag: TreeDrag;
	index: number;
}): Outline {
	if (!outline.committeeTemplate) return outline;
	if (drag.type === 'slot') {
		const slot = outline.committeeTemplate.slots[drag.index];
		if (!slot) return outline;
		return updateSlots({
			outline,
			change: (slots) => {
				const next = slots.filter((_, at) => at !== drag.index);
				next.splice(shifted({ index, removed: drag.index }), 0, slot);
				return next;
			}
		});
	}
	const page = draggedPage({ outline, drag });
	if (!page) return outline;
	const slot: TemplateSlot = page.label
		? { type: 'page', pageId: page.pageId, label: page.label }
		: { type: 'page', pageId: page.pageId };
	return updateSlots({
		outline: withoutSource({ outline, drag }),
		change: (slots) => {
			const next = [...slots];
			next.splice(Math.min(index, next.length), 0, slot);
			return next;
		}
	});
}

/** Where a drop puts what it carries: a place in a section or in the template. */
type Landing =
	{ kind: 'section'; section: number; entry: number } | { kind: 'template'; index: number };

function landingOf({
	outline,
	drop
}: {
	outline: Outline;
	drop: Exclude<TreeDrop, { type: 'block' }>;
}): Landing {
	switch (drop.type) {
		case 'entry':
			return { kind: 'section', ...drop.at };
		case 'sectionEnd':
			return {
				kind: 'section',
				section: drop.section,
				entry: outline.sections[drop.section]?.entries.length ?? 0
			};
		case 'slot':
			return { kind: 'template', index: drop.index };
		case 'templateEnd':
			return { kind: 'template', index: outline.committeeTemplate?.slots.length ?? 0 };
	}
}

/**
 * The outline after dropping `drag` on `drop`. Pages move between sections and the template (a
 * template slot that is not a page stays in the template); blocks only onto blocks. Anything
 * else leaves the outline as it is.
 */
export function dropInTree({
	outline,
	drag,
	drop
}: {
	outline: Outline;
	drag: TreeDrag;
	drop: TreeDrop;
}): Outline {
	if (drag.type === 'block' && drop.type === 'block') {
		return moveBlock({ outline, from: drag.index, to: drop.index });
	}
	if (drag.type === 'block' || drop.type === 'block') return outline;
	const landing = landingOf({ outline, drop });
	return landing.kind === 'section'
		? dropIntoSection({ outline, drag, ...landing })
		: dropIntoTemplate({ outline, drag, index: landing.index });
}

/** Where a page goes once created from the tree: the end of a section or of the template. */
export type PageTarget = { type: 'section'; section: number } | { type: 'template' } | null;

/** The outline with `pageId` put where `target` says (no target: unchanged). */
export function placePage({
	outline,
	target,
	pageId
}: {
	outline: Outline;
	target: PageTarget;
	pageId: string;
}): Outline {
	if (target?.type === 'section') return addEntry({ outline, section: target.section, pageId });
	if (target?.type === 'template') {
		return updateSlots({ outline, change: (slots) => [...slots, { type: 'page', pageId }] });
	}
	return outline;
}

/** The outline without any entry or template slot naming `pageId` (the page is being deleted). */
export function withoutPage({ outline, pageId }: { outline: Outline; pageId: string }): Outline {
	const sections = outline.sections.map((section) => ({
		...section,
		entries: section.entries.filter((entry) => entry.pageId !== pageId)
	}));
	return updateSlots({
		outline: { ...outline, sections },
		change: (slots) => slots.filter((slot) => slot.type !== 'page' || slot.pageId !== pageId)
	});
}
