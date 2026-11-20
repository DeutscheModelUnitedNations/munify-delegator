import type { Audience, AudienceType, Outline, OutlineSection, TemplateSlot } from './outline';

/**
 * Changes to a sidebar draft as the builder (`team/guide-sidebar`) makes them: each returns a new
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
