import { db } from '#api/db/db';
import { object, schemaBuilder, type ApiContext } from '#api/rumble';
import { mcpTool } from '#api/mcp/mcpTool';
import {
	conferencePubsub,
	guideOutlinePubsub,
	guideOutlineVersionPubsub,
	guidePagePubsub,
	guidePageVersionPubsub
} from '#api/pubsub';
import type { GuideReader } from '#lib/guide/outline';
import { assertMayPreview, editorIdOf, guideReaderOf } from '../guidePage/guidePagePermissions';
import {
	assertCanEditGuideOutline,
	registerGuideOutlineAbilities
} from './guideOutlinePermissions';
import {
	outlineArgSchema,
	publishOutline,
	restoreOutlineVersion,
	saveOutlineDraft
} from './guideOutlineService';
import { guideFor, readerPage, titledSections } from './guideReaderService';

registerGuideOutlineAbilities();

const GuideOutlineRef = object({ table: 'guideOutline' });
object({ table: 'guideOutlineVersion' });

type Subscriptions = Parameters<typeof guideOutlinePubsub.registerOnInstance>[0]['instance'];

/** Live: the sidebar, any page and the conference's switch (`guidePublished`). */
function listenToGuide(instance: Subscriptions) {
	for (const action of ['created', 'removed', 'updated'] as const) {
		guideOutlinePubsub.registerOnInstance({ instance, action });
		guidePagePubsub.registerOnInstance({ instance, action });
	}
	guideOutlineVersionPubsub.registerOnInstance({ instance, action: 'created' });
	guidePageVersionPubsub.registerOnInstance({ instance, action: 'created' });
	conferencePubsub.registerOnInstance({ instance, action: 'updated' });
}

// --- Reading ----------------------------------------------------------------------------------

const previewAudienceEnum = schemaBuilder.enumType('GuidePreviewAudience', {
	description: 'Whose guide a preview shows.',
	values: ['EVERYTHING', 'DELEGATE', 'NON_STATE_ACTOR', 'CUSTOM_ROLE', 'SUPERVISOR'] as const
});

const GuideEntryView = schemaBuilder.simpleObject('GuideEntryView', {
	fields: (t) => ({
		key: t.string({ description: 'Unique in the guide: a page shared by sections has one each.' }),
		pageId: t.id(),
		title: t.string(),
		indent: t.int()
	})
});

const GuideSectionView = schemaBuilder.simpleObject('GuideSectionView', {
	fields: (t) => ({
		key: t.string(),
		title: t.string(),
		entries: t.field({ type: [GuideEntryView] })
	})
});

const GuideView = schemaBuilder.simpleObject('GuideView', {
	description: "A reader's guide of a conference: their sidebar.",
	fields: (t) => ({
		preview: t.boolean({ description: 'A team preview: drafts or another reader.' }),
		sections: t.field({ type: [GuideSectionView] })
	})
});

const GuideHeadingView = schemaBuilder.simpleObject('GuideHeadingView', {
	fields: (t) => ({
		anchor: t.string({ description: "The heading's id in the page, for links into it." }),
		level: t.int(),
		text: t.string()
	})
});

const GuideReaderPage = schemaBuilder.simpleObject('GuideReaderPage', {
	description: 'A page of the guide as its reader reads it.',
	fields: (t) => ({
		pageId: t.id(),
		entryKey: t.string(),
		title: t.string(),
		sectionTitle: t.string(),
		content: t.field({
			type: 'JSON',
			description:
				'The text (TipTap JSON), placeholders filled in, files as download URLs, links to pages outside the guide as plain text.'
		}),
		headings: t.field({ type: [GuideHeadingView] }),
		previous: t.field({ type: GuideEntryView, nullable: true }),
		next: t.field({ type: GuideEntryView, nullable: true }),
		pdfUrl: t.string({ nullable: true, description: 'The committee text (agenda items).' }),
		updatedAt: t.field({ type: 'DateTime' })
	})
});

type PreviewArgs = {
	previewAs?: 'EVERYTHING' | 'DELEGATE' | 'NON_STATE_ACTOR' | 'CUSTOM_ROLE' | 'SUPERVISOR' | null;
	committeeId?: string | null;
	roleId?: string | null;
	draft?: boolean | null;
};

/** The reader a preview stands for. */
function previewReader(args: PreviewArgs): GuideReader {
	switch (args.previewAs) {
		case 'DELEGATE':
			return { kind: 'delegate', committeeId: args.committeeId ?? null, nonStateActor: false };
		case 'NON_STATE_ACTOR':
			return { kind: 'delegate', committeeId: null, nonStateActor: true };
		case 'CUSTOM_ROLE':
			return { kind: 'singleParticipant', roleId: args.roleId ?? '' };
		case 'SUPERVISOR':
			return { kind: 'supervisor' };
		default:
			return { kind: 'everything' };
	}
}

/**
 * Whose guide the caller reads, and whether drafts: their own, or for the team a preview of
 * another reader's. Undefined while they may not read it.
 */
async function readerFor({
	ctx,
	conferenceId,
	args
}: {
	ctx: ApiContext;
	conferenceId: string;
	args: PreviewArgs;
}) {
	const access = await guideReaderOf({ ctx, conferenceId });
	const previewing = Boolean(args.previewAs || args.draft);
	if (previewing) assertMayPreview(access);
	if (!access) return undefined;
	return {
		reader: args.previewAs ? previewReader(args) : access.reader,
		draft: args.draft ?? false,
		preview: previewing
	};
}

/** The caller's guide (or the previewed one), undefined while they may not read it. */
async function readGuide({
	ctx,
	conferenceId,
	args
}: {
	ctx: ApiContext;
	conferenceId: string;
	args: PreviewArgs;
}) {
	const reading = await readerFor({ ctx, conferenceId, args });
	if (!reading) return undefined;
	return { preview: reading.preview, guide: await guideFor({ conferenceId, ...reading }) };
}

const previewArgs = (t: Parameters<Parameters<typeof schemaBuilder.queryFields>[0]>[0]) => ({
	previewAs: t.arg({
		type: previewAudienceEnum,
		required: false,
		description: 'For the team: whose guide to show (with `committeeId` or `roleId`).'
	}),
	committeeId: t.arg.id({ required: false }),
	roleId: t.arg.id({ required: false }),
	draft: t.arg.boolean({
		required: false,
		description: 'For the team: the drafts of sidebar and pages instead of what is published.'
	})
});

schemaBuilder.queryFields((t) => ({
	myGuide: t.field({
		description:
			"The caller's guide of a conference: the sections and pages of its published sidebar that are for them. Null while they may not read it: participants once the conference published its guide and released the roles, supervisors all of it then, the team always (with previews).",
		type: GuideView,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }), ...previewArgs(t) },
		smartSubscription: true,
		subscribe: listenToGuide,
		resolve: async (_root, args, ctx) => {
			const read = await readGuide({ ctx, conferenceId: args.conferenceId, args });
			return read ? { preview: read.preview, sections: titledSections(read.guide) } : null;
		}
	}),

	guideReaderPage: t.field({
		description:
			"One page of the caller's guide (`myGuide`), with the previous and next one; `entryKey` picks one of several places of a page shared by sections. Null when the page is not in their guide.",
		type: GuideReaderPage,
		nullable: true,
		args: {
			conferenceId: t.arg.id({ required: true }),
			pageId: t.arg.id({ required: true }),
			entryKey: t.arg.string({ required: false }),
			...previewArgs(t)
		},
		smartSubscription: true,
		subscribe: listenToGuide,
		resolve: async (_root, args, ctx) => {
			const read = await readGuide({ ctx, conferenceId: args.conferenceId, args });
			if (!read) return null;
			const page = await readerPage({
				guide: read.guide,
				pageId: args.pageId,
				entryKey: args.entryKey
			});
			return page ?? null;
		}
	}),

	guideOutlineOf: t.drizzleField({
		description:
			"A conference's guide sidebar: the draft and what is published (`#lib/guide/outline`). Null before anybody wrote one. `editGuide` (project management, content lead) in the conference (FORBIDDEN otherwise).",
		type: GuideOutlineRef,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		smartSubscription: true,
		subscribe: listenToGuide,
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			return (
				(await db.query.guideOutline.findFirst(
					query(
						(await ctx.abilities.guideOutline.filter('read')).merge({
							where: { conferenceId: args.conferenceId }
						}).query.single
					)
				)) ?? null
			);
		}
	})
}));

// --- Writing ----------------------------------------------------------------------------------

const OUTLINE_DESCRIPTION =
	'The whole sidebar as JSON: `{ sections: [{ id, title, audience, entries: [{ pageId, label?, audience? }] }], committeeTemplate?: { position, titleFormat: "COMMITTEE_NAME", slots: [{ type: "page", pageId, label? } | { type: "committeePage", label? } | { type: "agendaItemPages" }] } }`. An audience is `{ type: "everyone" | "delegates" | "nonStateActors" | "supervisors" }` or `{ type: "customRoles", roleIds: [...] }`; supervisors and the team see everything. The template makes one section per committee, for its delegates, at `position` among the sections. Every page has to reach the conference, every role be one of its custom roles.';

schemaBuilder.mutationFields((t) => ({
	updateGuideOutlineDraft: t.field({
		extensions: mcpTool({ textArguments: ['outline'], idempotent: true }),
		description: `Writes a conference's sidebar draft, replacing it whole; participants see it once published. \`editGuide\` in the conference (FORBIDDEN otherwise), INVALID_INPUT for an outline that does not fit. ${OUTLINE_DESCRIPTION}`,
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			outline: t.arg({ type: 'JSON', required: true }).validate(outlineArgSchema)
		},
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			await saveOutlineDraft({
				conferenceId: args.conferenceId,
				outline: args.outline,
				editorId: editorIdOf(ctx)
			});
			return true;
		}
	}),

	publishGuideOutline: t.field({
		extensions: mcpTool({ outward: true }),
		description:
			"Publishes a conference's sidebar draft: its participants see these sections from now on (once the conference published its guide). Every page it names has to be published in the conference (CONFLICT, naming them, otherwise). `editGuide` in the conference (FORBIDDEN otherwise).",
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			await publishOutline({ conferenceId: args.conferenceId, editorId: editorIdOf(ctx) });
			return true;
		}
	}),

	restoreGuideOutlineVersion: t.field({
		description:
			"Copies a published version of a conference's sidebar into its draft. `editGuide` in the conference (FORBIDDEN otherwise).",
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }), versionId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOutline({ ctx, conferenceId: args.conferenceId });
			await restoreOutlineVersion({
				conferenceId: args.conferenceId,
				versionId: args.versionId,
				editorId: editorIdOf(ctx)
			});
			return true;
		}
	})
}));
