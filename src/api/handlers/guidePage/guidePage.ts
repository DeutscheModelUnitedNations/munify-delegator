import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { mcpTool } from '#api/mcp/mcpTool';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { guidePagePubsub, guidePageVersionPubsub } from '#api/pubsub';
import { downloadUrl } from '#api/handlers/storedFile/storedFileService';
import { GUIDE_SCOPE_KINDS, scopeKindOf } from '#lib/guide/scope';
import { parseGuideDocument } from '#lib/guide/document';
import { guideDocumentToMarkdown } from './guideMarkdown';
import {
	assertCanDeleteGuidePage,
	assertCanEditGuideOf,
	assertCanEditGuideOfAgendaItem,
	assertCanEditGuideOfCommittee,
	assertCanEditGuidePage,
	editorIdOf,
	registerGuidePageAbilities
} from './guidePagePermissions';
import {
	createGuidePage,
	deleteGuidePage,
	documentFrom,
	ensureOwnedGuidePage,
	guideContentSchema,
	guideFileUrls,
	guideMarkdownSchema,
	guidePageIdsReaching,
	guidePagePublishPreview,
	guideTitleSchema,
	publishGuidePage,
	restoreGuidePageVersion,
	setGuidePageScope,
	sidebarsNaming,
	updateGuidePageDraft
} from './guidePageService';
import { renderCommitteeText } from './committeeText';
import { importGuideFile } from './guideFileImport';
import { GUIDE_IMPORT_HOSTS } from '$app/env/private';

registerGuidePageAbilities();

const scopeKindEnum = schemaBuilder.enumType('GuideScopeKind', {
	description:
		'Where a guide page is shared: EVERYWHERE (every conference of a series, every year), YEAR (every series, the year of the conference), SERIES (the series of the conference, every year) or CONFERENCE (only that one).',
	values: GUIDE_SCOPE_KINDS
});

type Subscriptions = Parameters<typeof guidePagePubsub.registerOnInstance>[0]['instance'];

/** Live: pages coming and going, and changes to any of them (the lists are small). */
function listenToPages(instance: Subscriptions) {
	for (const action of ['created', 'removed', 'updated'] as const) {
		guidePagePubsub.registerOnInstance({ instance, action });
	}
	guidePageVersionPubsub.registerOnInstance({ instance, action: 'created' });
}

const GuideMarkdown = schemaBuilder.simpleObject('GuideMarkdown', {
	description: 'A page text as Markdown, for assistants.',
	fields: (t) => ({
		markdown: t.string(),
		omittedBlocks: t.stringList({
			description:
				'The rich blocks Markdown has no syntax for (callout, toggle, button, embed), left out of `markdown`. Read `content` (TipTap JSON) to see them; writing Markdown over them needs `replaceRichBlocks`.'
		})
	})
});

const GuidePageRef = object({
	table: 'guidePage',
	search: { columns: ['title'] },
	adjust: (t) => ({
		scope: t.field({
			description: "The draft's scope.",
			type: scopeKindEnum,
			resolve: (page) => scopeKindOf(page)
		}),
		publishedScope: t.field({
			description: 'The scope of what is published; null while nothing is.',
			type: scopeKindEnum,
			nullable: true,
			resolve: (page) =>
				page.publishedVersionId
					? scopeKindOf({
							seriesId: page.publishedSeriesId,
							year: page.publishedYear,
							conferenceId: page.publishedConferenceId
						})
					: null
		}),
		draftMarkdown: t.field({
			description: 'The draft as Markdown.',
			type: GuideMarkdown,
			resolve: (page) => guideDocumentToMarkdown(parseGuideDocument(page.content))
		}),
		usedInSidebars: t.stringList({
			description: 'The conferences (titles) whose published sidebar names the page.',
			resolve: (page) => sidebarsNaming(page.id)
		})
	})
});

object({
	table: 'guidePageVersion',
	adjust: (t) => ({
		markdown: t.field({
			description: 'The version as Markdown.',
			type: GuideMarkdown,
			resolve: (version) => guideDocumentToMarkdown(parseGuideDocument(version.content))
		}),
		scope: t.field({
			type: scopeKindEnum,
			resolve: (version) => scopeKindOf(version)
		}),
		pdfUrl: t.string({
			nullable: true,
			description: 'The committee text rendered from this version (agenda item pages).',
			resolve: async (version) => {
				if (!version.pdfFileId) return null;
				const file = await db.query.storedFile.findFirst({
					where: { id: version.pdfFileId },
					columns: { key: true, fileName: true }
				});
				return file ? downloadUrl(file) : null;
			}
		})
	})
});

query({ table: 'guidePage' });
// which files a page names: bookkeeping, read by system admins only
object({ table: 'guidePageFile' });

/** The page as the caller may read it, for re-reading the row a mutation wrote. */
async function readablePage({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.guidePage.filter('read')).merge({ where: { id } }).query.single;
}

const ConferenceTitle = schemaBuilder.simpleObject('GuideConferenceTitle', {
	fields: (t) => ({ id: t.id(), title: t.string() })
});

const GuidePublishPreview = schemaBuilder.simpleObject('GuidePagePublishPreview', {
	description: 'What publishing a page would do.',
	fields: (t) => ({
		scope: t.field({ type: scopeKindEnum }),
		reaches: t.field({
			type: [ConferenceTitle],
			description: 'The conferences the page reaches once published.'
		}),
		stopsReaching: t.field({
			type: [ConferenceTitle],
			description: 'The conferences that read it now and would not any more.'
		}),
		firstPublish: t.boolean(),
		titleChanges: t.boolean(),
		textChanges: t.boolean(),
		scopeChanges: t.boolean()
	})
});

const GuideFileUrl = schemaBuilder.simpleObject('GuideFileUrl', {
	fields: (t) => ({ fileId: t.id(), url: t.string(), fileName: t.string({ nullable: true }) })
});

const ImportedGuideFile = schemaBuilder.simpleObject('ImportedGuideFile', {
	fields: (t) => ({
		id: t.id({ description: 'For `file:<id>` in a page text.' }),
		fileName: t.string(),
		mimeType: t.string(),
		size: t.int()
	})
});

const contentArgs = (t: Parameters<Parameters<typeof schemaBuilder.mutationFields>[0]>[0]) => ({
	content: t
		.arg({
			type: 'JSON',
			required: false,
			description:
				'The text as a TipTap document: paragraph, heading (level 2–4), bulletList, orderedList, listItem, blockquote, horizontalRule, hardBreak, image (`src: "file:<id>"`, `alt`, `title` as caption), callout (`icon`: a Phosphor icon name such as `info`, `question`, `map-pin`; `color`: info|success|warning|error|neutral; block content), toggle (`summary`; block content), button (`href`, `label`), embed (`url`, YouTube); marks bold, italic, underline, strike, code, link (`href`: http(s), mailto, `guide:<pageId>` or `file:<fileId>`). Either this or `markdown`.'
		})
		.validate(guideContentSchema.nullish()),
	markdown: t.arg
		.string({
			required: false,
			description:
				'The text as Markdown (preferred): `##`–`####` headings, paragraphs, **bold**, *italic*, ~~strike~~, `code`, lists, `>` quotes, `---`, links (`[text](https://…)`, `[text](guide:<pageId>)` to another page, `[label](file:<fileId>)` to a download), images (`![caption](file:<fileId>)`), placeholders `{{Konferenz}}`, `{{Gremium}}`, `{{Themen}}`. Either this or `content`.'
		})
		.validate(guideMarkdownSchema.nullish())
});

schemaBuilder.queryFields((t) => ({
	guideLibrary: t.drizzleField({
		description:
			"The guide pages reaching a conference, drafts and published (their draft's or their published scope reaches it), by title. `editGuide` (project management, content lead) in the conference (FORBIDDEN otherwise).",
		type: [GuidePageRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		smartSubscription: true,
		subscribe: listenToPages,
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuideOf({ ctx, conferenceId: args.conferenceId });
			const ids = await guidePageIdsReaching(args.conferenceId);
			return db.query.guidePage.findMany(
				query({
					...(await ctx.abilities.guidePage.filter('read')).merge({
						where: { id: { in: ids } }
					}).query.many,
					orderBy: { title: 'asc' }
				})
			);
		}
	}),

	guideFileUrls: t.field({
		description:
			'Download URLs of guide files (`file:<id>` in page texts), for the editor. `editGuide` in the conference (FORBIDDEN otherwise); ids that are no guide file are left out.',
		type: [GuideFileUrl],
		args: {
			conferenceId: t.arg.id({ required: true }),
			fileIds: t.arg.idList({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOf({ ctx, conferenceId: args.conferenceId });
			return guideFileUrls(args.fileIds.slice(0, 500));
		}
	}),

	guidePagePublishPreview: t.field({
		description:
			'What publishing a page would do: the conferences it then reaches and stops reaching, and whether title, text or scope change. Show it before publishing. For whoever may change the page (NOT_FOUND otherwise).',
		type: GuidePublishPreview,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuidePage({ ctx, id: args.id });
			return guidePagePublishPreview(args.id);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	createGuidePage: t.drizzleField({
		extensions: mcpTool({ textArguments: ['title', 'markdown', 'content'] }),
		description:
			'Creates a guide page (a draft; nobody reads it before it is published and a sidebar names it), shared as `scope` says, seen from the conference: EVERYWHERE, YEAR or SERIES need the conference to belong to a series (INVALID_INPUT otherwise). `editGuide` (project management, content lead) in the conference (FORBIDDEN otherwise).',
		type: GuidePageRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			scope: t.arg({ type: scopeKindEnum, required: true }),
			title: t.arg.string({ required: true }).validate(guideTitleSchema),
			...contentArgs(t)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuideOf({ ctx, conferenceId: args.conferenceId });
			const content = documentFrom({
				content: args.content,
				markdown: args.markdown
			});
			const id = await createGuidePage({
				conferenceId: args.conferenceId,
				kind: args.scope,
				title: args.title,
				content,
				editorId: editorIdOf(ctx)
			});
			return db.query.guidePage
				.findFirst(query(await readablePage({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	ensureGuidePageOf: t.drizzleField({
		extensions: mcpTool({ idempotent: true }),
		description:
			"The guide page of a committee (`committeeId`) or of an agenda item (`agendaItemId`), created empty and titled after it when there is none yet. These pages fill the sidebar's committee template and stay in their conference. `editGuide` in its conference (NOT_FOUND otherwise).",
		type: GuidePageRef,
		args: {
			committeeId: t.arg.id({ required: false }),
			agendaItemId: t.arg.id({ required: false })
		},
		resolve: async (query, _root, args, ctx) => {
			const editorId = editorIdOf(ctx);
			let id: string;
			if (args.committeeId) {
				await assertCanEditGuideOfCommittee({ ctx, committeeId: args.committeeId });
				id = await ensureOwnedGuidePage({ committeeId: args.committeeId, editorId });
			} else if (args.agendaItemId) {
				await assertCanEditGuideOfAgendaItem({ ctx, agendaItemId: args.agendaItemId });
				id = await ensureOwnedGuidePage({ agendaItemId: args.agendaItemId, editorId });
			} else {
				throw apiError({ code: 'INVALID_INPUT', message: m.guideOwnerMissing() });
			}
			return db.query.guidePage
				.findFirst(query(await readablePage({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateGuidePageDraft: t.drizzleField({
		extensions: mcpTool({ textArguments: ['title', 'markdown', 'content'], idempotent: true }),
		description:
			"Writes a page's draft: its title and/or text (as Markdown or TipTap JSON); left out keeps them. Participants read it only once it is published. Markdown over a draft with callouts, toggles, buttons or embeds would drop them: CONFLICT unless `replaceRichBlocks`. CONFLICT as well when the draft changed since `expectedDraftUpdatedAt`. For whoever holds `editGuide` in a conference the page reaches (NOT_FOUND otherwise).",
		type: GuidePageRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string({ required: false }).validate(guideTitleSchema.nullish()),
			...contentArgs(t),
			replaceRichBlocks: t.arg.boolean({ required: false }),
			expectedDraftUpdatedAt: t.arg({
				type: 'DateTime',
				required: false,
				description: 'The `draftUpdatedAt` the editor last saw.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuidePage({ ctx, id: args.id });
			const current = args.markdown
				? (
						await db.query.guidePage.findFirst({
							where: { id: args.id },
							columns: { content: true }
						})
					)?.content
				: undefined;
			const content = documentFrom({
				content: args.content,
				markdown: args.markdown,
				current,
				replaceRichBlocks: args.replaceRichBlocks ?? false
			});
			await updateGuidePageDraft({
				id: args.id,
				title: args.title,
				content,
				editorId: editorIdOf(ctx),
				expectedDraftUpdatedAt: args.expectedDraftUpdatedAt
			});
			return db.query.guidePage
				.findFirst(query(await readablePage({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	setGuidePageScope: t.drizzleField({
		extensions: mcpTool({ idempotent: true }),
		description:
			"Sets where a general page's draft is shared, seen from the conference (`scope` reaching it); takes effect with the next publish. Committee and agenda item pages stay in their conference (INVALID_INPUT). `editGuide` in the conference, and the page reaching one of the caller's (NOT_FOUND / FORBIDDEN otherwise).",
		type: GuidePageRef,
		args: {
			id: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			scope: t.arg({ type: scopeKindEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuidePage({ ctx, id: args.id });
			await assertCanEditGuideOf({ ctx, conferenceId: args.conferenceId });
			await setGuidePageScope({
				id: args.id,
				conferenceId: args.conferenceId,
				kind: args.scope,
				editorId: editorIdOf(ctx)
			});
			return db.query.guidePage
				.findFirst(query(await readablePage({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	publishGuidePage: t.drizzleField({
		extensions: mcpTool({ outward: true }),
		description:
			"Publishes a page's draft as a new version: participants of every conference its scope reaches read it from now on, where a sidebar names it. Read `guidePagePublishPreview` first and show it. An agenda item page renders its committee text (PDF) on publish; a failed render fails the publish. For whoever may change the page (NOT_FOUND otherwise).",
		type: GuidePageRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuidePage({ ctx, id: args.id });
			await publishGuidePage({
				id: args.id,
				editorId: editorIdOf(ctx),
				render: renderCommitteeText
			});
			return db.query.guidePage
				.findFirst(query(await readablePage({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	restoreGuidePageVersion: t.drizzleField({
		description:
			"Copies a published version's title, text and scope into the page's draft; publish to make it current again. For whoever may change the page (NOT_FOUND otherwise).",
		type: GuidePageRef,
		args: { id: t.arg.id({ required: true }), versionId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanEditGuidePage({ ctx, id: args.id });
			await restoreGuidePageVersion({
				id: args.id,
				versionId: args.versionId,
				editorId: editorIdOf(ctx)
			});
			return db.query.guidePage
				.findFirst(query(await readablePage({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	importGuideFile: t.field({
		// a URL of the old guide's files, never about people
		extensions: mcpTool({ textArguments: ['url'] }),
		description:
			'Downloads a file (image or PDF, up to 20 MB) from an allowed host (the old guide: guide.dmun.de, cdn.dmun.de) and stores it as a guide file; answers its id for `file:<id>` in a page. Other hosts, types and sizes are refused (INVALID_INPUT). `editGuide` in the conference (FORBIDDEN otherwise).',
		type: ImportedGuideFile,
		args: {
			conferenceId: t.arg.id({ required: true }),
			url: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanEditGuideOf({ ctx, conferenceId: args.conferenceId });
			return importGuideFile({
				conferenceId: args.conferenceId,
				url: args.url,
				hosts: GUIDE_IMPORT_HOSTS
			});
		}
	}),

	deleteGuidePage: t.field({
		description:
			'Deletes a general page with its versions. CONFLICT while a published sidebar names it; committee and agenda item pages go with their committee or agenda item (INVALID_INPUT). For whoever may change the page (NOT_FOUND otherwise).',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteGuidePage({ ctx, id: args.id });
			await deleteGuidePage(args.id);
			return true;
		}
	})
}));
