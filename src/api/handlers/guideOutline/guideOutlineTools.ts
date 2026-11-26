import { schemaBuilder, type ApiContext } from '#api/rumble';
import { mcpTool } from '#api/mcp/mcpTool';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import type { Outline } from '#lib/guide/outline';
import { editorIdOf, assertCanEditGuidePage } from '../guidePage/guidePagePermissions';
import { publishGuidePage } from '../guidePage/guidePageService';
import { renderCommitteeText } from '../guidePage/committeeText';
import { assertCanEditGuideOutline } from './guideOutlinePermissions';
import {
	commandEdit,
	editOutlineDraft,
	outlineArgSchema,
	publishOutline,
	saveOutlineDraft
} from './guideOutlineService';
import {
	guideCommitteeMatrix,
	guidePendingChanges,
	guideVisibility
} from './guideWorkspaceService';
import {
	AUDIENCE_TYPES,
	SLOT_TYPES,
	audienceArgSchema,
	labelArgSchema,
	slotsArgSchema,
	titleArgSchema
} from './outlineArgs';
import {
	addEntryTo,
	addSectionAt,
	changeEntry,
	changeSection,
	deleteEntry,
	deleteSection,
	moveBlockTo,
	moveEntryTo,
	moveSlot,
	setOverview,
	setTemplate,
	type BlockRef,
	type CommandResult
} from './outlineCommands';

/**
 * The guide sidebar change by change, and the team workspace's views (`team/guide`), for the app
 * and assistants: each change reads the draft, applies one edit (`outlineCommands`) and saves
 * it, refused (CONFLICT) when `expectedDraftUpdatedAt` is given and the draft moved on since.
 */

// --- Types ------------------------------------------------------------------------------------

const audienceTypeEnum = schemaBuilder.enumType('GuideAudienceType', {
	description: 'Who a section or entry is for; supervisors and the team see everything.',
	values: AUDIENCE_TYPES
});

const AudienceInput = schemaBuilder.inputType('GuideAudienceInput', {
	fields: (t) => ({
		type: t.field({ type: audienceTypeEnum, required: true }),
		roleIds: t.idList({
			required: false,
			description: 'With `customRoles`: custom roles of the conference (at least one).'
		})
	})
});

const slotTypeEnum = schemaBuilder.enumType('GuideTemplateSlotType', {
	description:
		'A slot of the committee template: a page shared by all committees, the committee’s own page, or its agenda items’ pages.',
	values: SLOT_TYPES
});

const SlotInput = schemaBuilder.inputType('GuideTemplateSlotInput', {
	fields: (t) => ({
		type: t.field({ type: slotTypeEnum, required: true }),
		pageId: t.id({ required: false, description: 'With `page`: the shared page.' }),
		label: t.string({ required: false, description: 'Instead of the page title.' })
	})
});

const DraftChange = schemaBuilder.simpleObject('GuideOutlineDraftChange', {
	description: 'The sidebar draft after a change.',
	fields: (t) => ({
		draft: t.field({ type: 'JSON', description: 'The whole draft (`#lib/guide/outline`).' }),
		draftUpdatedAt: t.field({
			type: 'DateTime',
			description: 'Pass it as `expectedDraftUpdatedAt` with the next change.'
		}),
		sectionId: t.string({ nullable: true, description: 'The section a change created.' })
	})
});

const visibilityEnum = schemaBuilder.enumType('GuideVisibility', {
	description:
		'`all` of it, `some` (entries with their own audience are hidden), `own` (only the section of their own committee), `none`.',
	values: ['all', 'some', 'own', 'none'] as const
});

const ReaderGroupView = schemaBuilder.simpleObject('GuideReaderGroupView', {
	fields: (t) => ({
		type: t.string({ description: 'delegates, nonStateActors, customRole or supervisors.' }),
		roleId: t.id({ nullable: true }),
		roleName: t.string({ nullable: true })
	})
});

const VisibilityRowView = schemaBuilder.simpleObject('GuideVisibilityRow', {
	fields: (t) => ({
		kind: t.string({ description: 'section, entry (with its own audience) or template.' }),
		key: t.string(),
		title: t.string(),
		sectionId: t.string({ nullable: true }),
		cells: t.field({ type: [visibilityEnum], description: 'One per group, in their order.' })
	})
});

const VisibilityView = schemaBuilder.simpleObject('GuideVisibilityView', {
	description: "Who sees what of a conference's guide sidebar.",
	fields: (t) => ({
		groups: t.field({ type: [ReaderGroupView] }),
		rows: t.field({ type: [VisibilityRowView] })
	})
});

const pageStateEnum = schemaBuilder.enumType('GuidePageState', {
	description: 'Never published, published as it stands, or changed since.',
	values: ['DRAFT', 'PUBLISHED', 'CHANGED'] as const
});

const MatrixPageView = schemaBuilder.simpleObject('GuideMatrixPage', {
	fields: (t) => ({ id: t.id(), title: t.string(), state: t.field({ type: pageStateEnum }) })
});

const MatrixCellView = schemaBuilder.simpleObject('GuideMatrixCell', {
	fields: (t) => ({
		kind: t.string({
			description:
				'page, missing (create it with ensureGuidePageOf for the committee or agenda item) or none (the committee has fewer agenda items).'
		}),
		pageId: t.id({ nullable: true }),
		title: t.string({ nullable: true }),
		state: t.field({ type: pageStateEnum, nullable: true }),
		committeeId: t.id({ nullable: true }),
		agendaItemId: t.id({ nullable: true })
	})
});

const MatrixRowView = schemaBuilder.simpleObject('GuideMatrixRow', {
	fields: (t) => ({
		kind: t.string({ description: 'shared (one page for all), committeePage or agendaItem.' }),
		key: t.string(),
		label: t.string({ nullable: true }),
		number: t.int({ nullable: true, description: 'The agenda item number (agendaItem).' }),
		page: t.field({ type: MatrixPageView, nullable: true, description: 'The shared page.' }),
		cells: t.field({ type: [MatrixCellView], description: 'One per committee, in their order.' })
	})
});

const MatrixCommitteeView = schemaBuilder.simpleObject('GuideMatrixCommittee', {
	fields: (t) => ({
		id: t.id(),
		name: t.string(),
		abbreviation: t.string(),
		published: t.int({ description: 'Its own pages published as they stand.' }),
		total: t.int({ description: 'Its own pages the template asks for.' })
	})
});

const MatrixView = schemaBuilder.simpleObject('GuideCommitteeMatrixView', {
	description: "A conference's committee template against its committees.",
	fields: (t) => ({
		hasTemplate: t.boolean({ description: 'Without one, the committee and agenda item pages.' }),
		committees: t.field({ type: [MatrixCommitteeView] }),
		rows: t.field({ type: [MatrixRowView] })
	})
});

const PendingPageView = schemaBuilder.simpleObject('GuidePendingPage', {
	fields: (t) => ({
		id: t.id(),
		title: t.string(),
		kind: t.string(),
		state: t.field({ type: pageStateEnum })
	})
});

const PendingView = schemaBuilder.simpleObject('GuidePendingChanges', {
	description: 'What publishing the guide’s changes would publish.',
	fields: (t) => ({
		pages: t.field({
			type: [PendingPageView],
			description: 'Pages the draft sidebar uses that are not published as they stand.'
		}),
		sidebarChanged: t.boolean({ description: 'The sidebar draft differs from what is published.' }),
		sidebarPublished: t.boolean({ description: 'A sidebar was ever published.' })
	})
});

const PublishedChanges = schemaBuilder.simpleObject('GuidePublishedChanges', {
	fields: (t) => ({
		publishedPageIds: t.idList(),
		sidebarPublished: t.boolean()
	})
});

// --- Reading ----------------------------------------------------------------------------------

const EDIT_GUIDE = '`editGuide` in the conference (FORBIDDEN otherwise).';

schemaBuilder.queryFields((t) => ({
	guideVisibility: t.field({
		description: `Who sees what of a conference's guide sidebar, as the workspace's visibility tab shows it: a row per section, per entry with its own audience and for the committee template, a cell per reader group (delegates, NA, each custom role, supervisors). ${EDIT_GUIDE}`,
		type: VisibilityView,
		args: {
			conferenceId: t.arg.id({ required: true }),
			draft: t.arg.boolean({
				required: false,
				description: 'The draft (default) or what is published.'
			})
		},
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			return guideVisibility({ conferenceId: args.conferenceId, draft: args.draft ?? true });
		}
	}),

	guideCommitteeMatrix: t.field({
		description: `The draft's committee template against the committees, as the workspace's committee tab shows it: a row per slot (agenda item pages one per agenda item number), each committee's page state or what is missing, and per committee how many of its own pages are published. ${EDIT_GUIDE}`,
		type: MatrixView,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			return guideCommitteeMatrix(args.conferenceId);
		}
	}),

	guidePendingChanges: t.field({
		description: `What "publish changes" would publish: the pages the draft sidebar uses (with the template, the committee and agenda item pages) that are not published as they stand, and whether the sidebar changed. ${EDIT_GUIDE}`,
		type: PendingView,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			return guidePendingChanges(args.conferenceId);
		}
	})
}));

// --- Changing ---------------------------------------------------------------------------------

/** Checks the caller and changes the draft with one command. */
async function changeDraft({
	ctx,
	conferenceId,
	expected,
	command
}: {
	ctx: ApiContext;
	conferenceId: string;
	expected: Date | null | undefined;
	command: (outline: Outline) => CommandResult;
}) {
	await assertCanEditGuideOutline({ ctx, conferenceId });
	const saved = await editOutlineDraft({
		conferenceId,
		editorId: editorIdOf(ctx),
		expectedDraftUpdatedAt: expected,
		edit: commandEdit(command)
	});
	return { ...saved, sectionId: saved.sectionId ?? null };
}

/**
 * A section, the template or the topic overview, from `sectionId`, `template: true` or
 * `topicOverview: true` (exactly one).
 */
function blockOf({
	sectionId,
	template,
	topicOverview
}: {
	sectionId?: string | null;
	template?: boolean | null;
	topicOverview?: boolean | null;
}): BlockRef {
	const named = [Boolean(sectionId), Boolean(template), Boolean(topicOverview)];
	if (named.filter(Boolean).length !== 1) {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideOutlineSectionOrTemplate() });
	}
	if (sectionId) return { sectionId };
	return template ? 'template' : 'topics';
}

/** Where an entry goes: a section or the template (exactly one). */
function entryTargetOf(args: { sectionId?: string | null; template?: boolean | null }) {
	const block = blockOf(args);
	return block === 'topics' ? 'template' : block;
}

const CHANGE =
	"Changes the conference's sidebar draft (participants see it once published). `editGuide` in the conference (FORBIDDEN otherwise); NOT_FOUND when what it names is not in the draft; INVALID_INPUT when the result does not fit (pages that do not reach the conference, roles that are not its custom roles). Answers the draft and its `draftUpdatedAt`; with `expectedDraftUpdatedAt` a draft changed since then is left alone (CONFLICT): read `guideOutlineOf` again.";

const OUTLINE_DESCRIPTION =
	'The whole sidebar as JSON: `{ sections: [{ id, title, audience, entries: [{ pageId, label?, audience? }] }], committeeTemplate?: { position, titleFormat: "COMMITTEE_NAME", slots: [{ type: "page", pageId, label? } | { type: "committeePage", label? } | { type: "agendaItemPages" }] } }`. An audience is `{ type: "everyone" | "delegates" | "nonStateActors" | "supervisors" }` or `{ type: "customRoles", roleIds: [...] }`; supervisors and the team see everything. The template makes one section per committee, for its delegates, at `position` among the sections. Every page has to reach the conference, every role be one of its custom roles.';

type MutationFieldBuilder = Parameters<Parameters<typeof schemaBuilder.mutationFields>[0]>[0];

const commonArgs = (t: MutationFieldBuilder) => ({
	conferenceId: t.arg.id({ required: true }),
	expectedDraftUpdatedAt: t.arg({
		type: 'DateTime',
		required: false,
		description: 'The `draftUpdatedAt` last read; refuses (CONFLICT) once the draft moved on.'
	})
});

const audienceArg = (t: MutationFieldBuilder, description: string) =>
	t
		.arg({ type: AudienceInput, required: false, description })
		.validate(audienceArgSchema.nullish());

schemaBuilder.mutationFields((t) => ({
	updateGuideOutlineDraft: t.field({
		extensions: mcpTool({ textArguments: ['outline'], idempotent: true }),
		description: `Writes a conference's sidebar draft, replacing it whole; participants see it once published. For small changes prefer the single ones (addGuideSection, addGuideEntry, moveGuideEntry, …), which keep the rest as it is. \`editGuide\` in the conference (FORBIDDEN otherwise), INVALID_INPUT for an outline that does not fit; with \`expectedDraftUpdatedAt\` a draft changed since then is left alone (CONFLICT). ${OUTLINE_DESCRIPTION}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			outline: t.arg({ type: 'JSON', required: true }).validate(outlineArgSchema)
		},
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			const saved = await saveOutlineDraft({
				conferenceId: args.conferenceId,
				outline: args.outline,
				editorId: editorIdOf(ctx),
				expectedDraftUpdatedAt: args.expectedDraftUpdatedAt
			});
			return { ...saved, sectionId: null };
		}
	}),

	addGuideSection: t.field({
		extensions: mcpTool({ textArguments: ['title'] }),
		description: `Adds a section to the sidebar, last or at \`position\` among the blocks (the sections and the committee template, in the sidebar's order); answers its \`sectionId\`. ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			title: t.arg.string({ required: true }).validate(titleArgSchema),
			audience: audienceArg(t, 'Who it is for (default: everyone).'),
			position: t.arg.int({ required: false })
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					addSectionAt({
						outline,
						title: args.title,
						audience: args.audience ?? undefined,
						position: args.position ?? undefined
					})
			})
	}),

	updateGuideSection: t.field({
		extensions: mcpTool({ textArguments: ['title'], idempotent: true }),
		description: `Renames a section or changes who it is for; what is left out stays. ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			sectionId: t.arg.id({ required: true }),
			title: t.arg.string({ required: false }).validate(titleArgSchema.nullish()),
			audience: audienceArg(t, 'Who it is for.')
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					changeSection({
						outline,
						sectionId: args.sectionId,
						title: args.title ?? undefined,
						audience: args.audience ?? undefined
					})
			})
	}),

	removeGuideSection: t.field({
		extensions: mcpTool(),
		description: `Removes a section with its entries (the pages stay). ${CHANGE}`,
		type: DraftChange,
		args: { ...commonArgs(t), sectionId: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) => deleteSection({ outline, sectionId: args.sectionId })
			})
	}),

	moveGuideSection: t.field({
		extensions: mcpTool({ idempotent: true }),
		description: `Moves a section (\`sectionId\`), the committee template (\`template: true\`) or the topic overview (\`topicOverview: true\`) to \`position\` among the blocks (the sections, the template and the overview, in the sidebar's order; past the end: last). ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			sectionId: t.arg.id({ required: false }),
			template: t.arg.boolean({ required: false }),
			topicOverview: t.arg.boolean({ required: false }),
			position: t.arg.int({ required: true })
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					moveBlockTo({ outline, block: blockOf(args), position: args.position })
			})
	}),

	addGuideEntry: t.field({
		extensions: mcpTool({ textArguments: ['label'] }),
		description: `Lists a page in a section, last or before the entry at \`position\`. The page has to reach the conference (\`guideLibrary\`). ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			sectionId: t.arg.id({ required: true }),
			pageId: t.arg.id({ required: true }),
			position: t.arg.int({ required: false }),
			label: t.arg.string({ required: false }).validate(labelArgSchema.nullish()),
			audience: audienceArg(t, 'Only for these readers of the section (default: all of them).')
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					addEntryTo({
						outline,
						sectionId: args.sectionId,
						pageId: args.pageId,
						position: args.position ?? undefined,
						label: args.label || undefined,
						audience: args.audience ?? undefined
					})
			})
	}),

	updateGuideEntry: t.field({
		extensions: mcpTool({ textArguments: ['label'], idempotent: true }),
		description: `Changes the entry of a page in a section (its first, should the section list the page twice): its label or its own audience. Left out stays, \`null\` clears (the page title; the section's audience). ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			sectionId: t.arg.id({ required: true }),
			pageId: t.arg.id({ required: true }),
			label: t.arg.string({ required: false }).validate(labelArgSchema.nullish()),
			audience: audienceArg(t, 'Only for these readers of the section; null: all of them.')
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					changeEntry({
						outline,
						sectionId: args.sectionId,
						pageId: args.pageId,
						label: args.label,
						audience: args.audience
					})
			})
	}),

	moveGuideEntry: t.field({
		extensions: mcpTool({ idempotent: true }),
		description: `Moves the entry of a page (\`sectionId\`, \`pageId\`) within its section, into another (\`toSectionId\`) or into the committee template as a page shared by all committees (\`toTemplate: true\`), before what stands at \`position\` once it left (left out or past the end: last). ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			sectionId: t.arg.id({ required: true }),
			pageId: t.arg.id({ required: true }),
			toSectionId: t.arg.id({ required: false }),
			toTemplate: t.arg.boolean({ required: false }),
			position: t.arg.int({ required: false })
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					moveEntryTo({
						outline,
						from: { sectionId: args.sectionId, pageId: args.pageId },
						to: {
							block: entryTargetOf({ sectionId: args.toSectionId, template: args.toTemplate }),
							position: args.position ?? undefined
						}
					})
			})
	}),

	removeGuideEntry: t.field({
		extensions: mcpTool(),
		description: `Takes a page out of a section (its first entry there); the page stays. ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			sectionId: t.arg.id({ required: true }),
			pageId: t.arg.id({ required: true })
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					deleteEntry({ outline, sectionId: args.sectionId, pageId: args.pageId })
			})
	}),

	setGuideTemplate: t.field({
		extensions: mcpTool({ textArguments: ['slots'], idempotent: true }),
		description: `Switches the committee template on or off. It makes one section per committee, for its delegates. Switched on it starts with the committee's page and its agenda items' pages after the first section, or takes \`slots\` (which replace the slots it has). ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			enabled: t.arg.boolean({ required: true }),
			slots: t.arg({ type: [SlotInput], required: false }).validate(slotsArgSchema.nullish())
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					setTemplate({ outline, enabled: args.enabled, slots: args.slots ?? undefined })
			})
	}),

	setGuideTopicOverview: t.field({
		extensions: mcpTool({ textArguments: ['title'], idempotent: true }),
		description: `Switches the topic overview on or off: one section listing every committee's page (labelled with the committee's name) with its agenda items' pages beneath, so readers without a committee of their own can prepare all topics. Delegates never see it (they have their committee section); it is for non-state actors, supervisors (besides their committee sections) and the custom roles in \`roleIds\`. A new one stands last (move it with moveGuideSection, \`topicOverview: true\`) and is for non-state actors and supervisors; what is left out stays. ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			enabled: t.arg.boolean({ required: true }),
			title: t.arg.string({ required: false }).validate(titleArgSchema.nullish()),
			nonStateActors: t.arg.boolean({ required: false }),
			supervisors: t.arg.boolean({ required: false }),
			roleIds: t.arg.idList({
				required: false,
				description: 'Custom roles of the conference that read it (replaces the list).'
			})
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) =>
					setOverview({
						outline,
						enabled: args.enabled,
						title: args.title ?? undefined,
						defaultTitle: m.guideTopicOverviewTitle(),
						readers: {
							...(typeof args.nonStateActors === 'boolean'
								? { nonStateActors: args.nonStateActors }
								: {}),
							...(typeof args.supervisors === 'boolean' ? { supervisors: args.supervisors } : {}),
							...(args.roleIds ? { roleIds: [...new Set(args.roleIds)] } : {})
						}
					})
			})
	}),

	moveGuideTemplateSlot: t.field({
		extensions: mcpTool(),
		description: `Moves a slot of the committee template from index \`from\` to index \`to\` (past the end: last). ${CHANGE}`,
		type: DraftChange,
		args: {
			...commonArgs(t),
			from: t.arg.int({ required: true }),
			to: t.arg.int({ required: true })
		},
		resolve: (_root, args, ctx) =>
			changeDraft({
				ctx,
				conferenceId: args.conferenceId,
				expected: args.expectedDraftUpdatedAt,
				command: (outline) => moveSlot({ outline, from: args.from, to: args.to })
			})
	}),

	publishGuideChanges: t.field({
		extensions: mcpTool({ outward: true }),
		description: `Publishes the guide's changes like the workspace's "publish changes": first the pages waiting to be published (\`guidePendingChanges\`; \`pageIds\` picks some of them), then the sidebar draft. Participants of every conference a published page reaches read it from now on. Read \`guidePendingChanges\` (and \`guidePagePublishPreview\` for shared pages) and show it first. Pages already published stay so when the sidebar fails (CONFLICT, naming pages it uses that are still unpublished). ${EDIT_GUIDE}`,
		type: PublishedChanges,
		args: {
			conferenceId: t.arg.id({ required: true }),
			pageIds: t.arg.idList({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			const pending = (await guidePendingChanges(args.conferenceId)).pages.map((page) => page.id);
			const picked = args.pageIds ? pending.filter((id) => args.pageIds?.includes(id)) : pending;
			for (const id of picked) await assertCanEditGuidePage({ ctx, id });
			const editorId = editorIdOf(ctx);
			for (const id of picked) {
				await publishGuidePage({ id, editorId, render: renderCommitteeText });
			}
			await publishOutline({ conferenceId: args.conferenceId, editorId });
			return { publishedPageIds: picked, sidebarPublished: true };
		}
	})
}));
