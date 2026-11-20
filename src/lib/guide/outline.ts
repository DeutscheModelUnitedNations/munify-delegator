import { z } from 'zod';

/**
 * A conference's guide sidebar (`guideOutline`): sections of entries pointing at pages, each for an
 * audience, and a committee template expanded once per committee. The draft and the published
 * outline are one document each, checked by `outlineSchema`.
 */

const id = z.string().min(1).max(100);
const label = z.string().trim().max(200).optional();

const audienceSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('everyone') }),
	z.object({ type: z.literal('delegates') }),
	z.object({ type: z.literal('nonStateActors') }),
	z.object({ type: z.literal('customRoles'), roleIds: z.array(id).min(1).max(100) }),
	z.object({ type: z.literal('supervisors') })
]);
export type Audience = z.infer<typeof audienceSchema>;
export type AudienceType = Audience['type'];

const outlineEntrySchema = z.object({
	pageId: id,
	label,
	audience: audienceSchema.optional()
});

const outlineSectionSchema = z.object({
	id,
	title: z.string().trim().min(1).max(200),
	audience: audienceSchema,
	entries: z.array(outlineEntrySchema).max(200)
});
export type OutlineSection = z.infer<typeof outlineSectionSchema>;

const templateSlotSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('page'), pageId: id, label }),
	z.object({ type: z.literal('committeePage'), label }),
	z.object({ type: z.literal('agendaItemPages') })
]);
export type TemplateSlot = z.infer<typeof templateSlotSchema>;

const committeeTemplateSchema = z.object({
	/** Where the committee sections go among the sections: before the section at this index. */
	position: z.number().int().min(0),
	titleFormat: z.literal('COMMITTEE_NAME'),
	slots: z.array(templateSlotSchema).max(100)
});
export type CommitteeTemplate = z.infer<typeof committeeTemplateSchema>;

export const outlineSchema = z.object({
	sections: z.array(outlineSectionSchema).max(100),
	committeeTemplate: committeeTemplateSchema.optional()
});
export type Outline = z.infer<typeof outlineSchema>;

export const EMPTY_OUTLINE: Outline = { sections: [] };

/** The outline stored in a column, or the empty one for anything that is not an outline. */
export function parseOutline(value: unknown): Outline {
	const parsed = outlineSchema.safeParse(value);
	return parsed.success ? parsed.data : EMPTY_OUTLINE;
}

/** Every page an outline names directly (not the committee and agenda item pages it fills in). */
export function outlinePageIds(outline: Outline) {
	const ids = new Set<string>();
	for (const section of outline.sections) {
		for (const entry of section.entries) ids.add(entry.pageId);
	}
	for (const slot of outline.committeeTemplate?.slots ?? []) {
		if (slot.type === 'page') ids.add(slot.pageId);
	}
	return [...ids];
}

/** Every custom role an outline names, for checking they are the conference's. */
export function outlineRoleIds(outline: Outline) {
	const audiences = outline.sections.flatMap((section) => [
		section.audience,
		...section.entries.flatMap((entry) => (entry.audience ? [entry.audience] : []))
	]);
	return [
		...new Set(
			audiences.flatMap((audience) => (audience.type === 'customRoles' ? audience.roleIds : []))
		)
	];
}

// --- Expanding --------------------------------------------------------------------------------

/** An audience after expanding: the committee sections are for that committee's delegates. */
export type ResolvedAudience = Audience | { type: 'committee'; committeeId: string };

export type GuideEntry = {
	/** Unique in the guide: the section and the page (a shared page stands in many sections). */
	key: string;
	pageId: string;
	label: string | null;
	audience: ResolvedAudience | null;
	/** Agenda item pages sit one level in, under their committee page. */
	indent: 0 | 1;
};

export type GuideSection = {
	key: string;
	title: string;
	audience: ResolvedAudience;
	/** The committee a template section was expanded for; fills `{{Gremium}}` and `{{Themen}}`. */
	committeeId: string | null;
	entries: GuideEntry[];
};

/** What the template needs of a committee, in the order the sidebar lists them. */
export type TemplateCommittee = {
	id: string;
	name: string;
	/** The committee's own page, if it has one. */
	pageId: string | null;
	/** Its agenda items' pages, in the agenda items' order. */
	agendaItemPageIds: readonly string[];
};

function entryKey({ sectionKey, pageId }: { sectionKey: string; pageId: string }) {
	return `${sectionKey}~${pageId}`;
}

function committeeSection({
	template,
	committee
}: {
	template: CommitteeTemplate;
	committee: TemplateCommittee;
}): GuideSection {
	const key = `committee-${committee.id}`;
	const entries: GuideEntry[] = [];
	const add = ({ pageId, label, indent }: { pageId: string; label?: string; indent: 0 | 1 }) => {
		const entry = entryKey({ sectionKey: key, pageId });
		// a page listed twice in one section would have one key; the first one counts
		if (entries.some((existing) => existing.key === entry)) return;
		entries.push({ key: entry, pageId, label: label ?? null, audience: null, indent });
	};
	for (const slot of template.slots) {
		if (slot.type === 'page') add({ pageId: slot.pageId, label: slot.label, indent: 0 });
		else if (slot.type === 'committeePage') {
			if (committee.pageId) add({ pageId: committee.pageId, label: slot.label, indent: 0 });
		} else {
			for (const pageId of committee.agendaItemPageIds) add({ pageId, indent: 1 });
		}
	}
	return {
		key,
		title: committee.name,
		audience: { type: 'committee', committeeId: committee.id },
		committeeId: committee.id,
		entries
	};
}

/**
 * The outline as a conference's sidebar: its sections, with one section per committee from the
 * template put in at the template's position.
 */
export function expandOutline({
	outline,
	committees
}: {
	outline: Outline;
	committees: readonly TemplateCommittee[];
}): GuideSection[] {
	const sections: GuideSection[] = outline.sections.map((section) => ({
		key: section.id,
		title: section.title,
		audience: section.audience,
		committeeId: null,
		entries: section.entries.map((entry) => ({
			key: entryKey({ sectionKey: section.id, pageId: entry.pageId }),
			pageId: entry.pageId,
			label: entry.label ?? null,
			audience: entry.audience ?? null,
			indent: 0
		}))
	}));
	const template = outline.committeeTemplate;
	if (!template) return sections;
	const position = Math.min(template.position, sections.length);
	const expanded = committees.map((committee) => committeeSection({ template, committee }));
	return [...sections.slice(0, position), ...expanded, ...sections.slice(position)];
}

// --- Readers ----------------------------------------------------------------------------------

/**
 * Who reads a guide, by their part in the conference: the team and supervisors read all of it, a
 * delegate their committee's section and what is for delegates (or non-state actors), a single
 * participant what is for their custom role.
 */
export type GuideReader =
	| { kind: 'everything' }
	| { kind: 'supervisor' }
	| { kind: 'delegate'; committeeId: string | null; nonStateActor: boolean }
	| { kind: 'singleParticipant'; roleId: string };

/** Whether `reader` is in `audience`. */
function audienceIncludes({
	audience,
	reader
}: {
	audience: ResolvedAudience;
	reader: GuideReader;
}): boolean {
	if (reader.kind === 'everything' || reader.kind === 'supervisor') return true;
	switch (audience.type) {
		case 'everyone':
			return true;
		case 'supervisors':
			return false;
		case 'delegates':
			return reader.kind === 'delegate' && !reader.nonStateActor;
		case 'nonStateActors':
			return reader.kind === 'delegate' && reader.nonStateActor;
		case 'customRoles':
			return reader.kind === 'singleParticipant' && audience.roleIds.includes(reader.roleId);
		case 'committee':
			return (
				reader.kind === 'delegate' &&
				!reader.nonStateActor &&
				reader.committeeId === audience.committeeId
			);
	}
}

/** The sections and entries `reader` sees, empty sections left out. */
export function guideForReader({
	sections,
	reader
}: {
	sections: readonly GuideSection[];
	reader: GuideReader;
}): GuideSection[] {
	return sections
		.filter((section) => audienceIncludes({ audience: section.audience, reader }))
		.map((section) => ({
			...section,
			entries: section.entries.filter(
				(entry) => !entry.audience || audienceIncludes({ audience: entry.audience, reader })
			)
		}))
		.filter((section) => section.entries.length > 0);
}

/** Leaves out entries whose page `isAvailable` says is not there (not published, not reaching). */
export function withAvailablePages({
	sections,
	isAvailable
}: {
	sections: readonly GuideSection[];
	isAvailable: (pageId: string) => boolean;
}): GuideSection[] {
	return sections
		.map((section) => ({
			...section,
			entries: section.entries.filter((entry) => isAvailable(entry.pageId))
		}))
		.filter((section) => section.entries.length > 0);
}

/**
 * The entry a reader opened, and the entries before and after it in sidebar order. `key` picks one
 * of several entries of the same page; without it (or when it does not match) the page's first
 * entry counts.
 */
export function locateEntry({
	sections,
	pageId,
	key
}: {
	sections: readonly GuideSection[];
	pageId: string;
	key?: string | null;
}) {
	const flat = sections.flatMap((section) => section.entries.map((entry) => ({ section, entry })));
	let index = key
		? flat.findIndex(({ entry }) => entry.key === key && entry.pageId === pageId)
		: -1;
	if (index === -1) index = flat.findIndex(({ entry }) => entry.pageId === pageId);
	if (index === -1) return undefined;
	return {
		section: flat[index].section,
		entry: flat[index].entry,
		previous: index > 0 ? flat[index - 1].entry : null,
		next: index < flat.length - 1 ? flat[index + 1].entry : null
	};
}
