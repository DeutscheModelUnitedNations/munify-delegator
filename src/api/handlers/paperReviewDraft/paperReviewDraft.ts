import { db } from '#api/db/db';
import { editorDocumentSchema } from '#api/handlers/paper/paperService';
import { enum_, object, schemaBuilder, type ApiContext } from '#api/rumble';
import { mcpTool } from '#api/mcp/mcpTool';
import { paperReviewDraftPubsub } from '#api/pubsub';
import { assertFindFirstExists } from '@m1212e/rumble';
import { assertCanReviewPaper } from '../paperReview/paperReviewPermissions';
import { reviewVerdictSchema } from '../paperReview/paperReviewService';
import { registerPaperReviewDraftAbilities } from './paperReviewDraftPermissions';
import {
	deleteReviewDraft,
	reviewDraftLink,
	reviewDraftMarkdownSchema,
	saveAssistantReviewDraft,
	saveReviewDraft
} from './paperReviewDraftService';

registerPaperReviewDraftAbilities();

/**
 * Live: a draft coming or going makes a field ask again; a change to one is that row's (its own
 * id), so an open review editor hears of an assistant writing its draft again.
 */
function listenToDrafts(
	instance: Parameters<typeof paperReviewDraftPubsub.registerOnInstance>[0]['instance']
) {
	paperReviewDraftPubsub.registerOnInstance({ instance, action: 'created' });
	paperReviewDraftPubsub.registerOnInstance({ instance, action: 'removed' });
}

const PaperReviewDraftRef = object({ table: 'paperReviewDraft' });
const paperStatusEnum = enum_({ tsName: 'paperStatus' });

/** Who writes: an AI assistant over MCP, or the reviewer in the app. */
const writtenBy = (ctx: ApiContext): 'MCP' | 'UI' => (ctx.mcp ? 'MCP' : 'UI');

/** The caller's own draft of a paper, as far as they may read it. */
const ownDraft = async ({ ctx, paperId }: { ctx: ApiContext; paperId: string }) =>
	(await ctx.abilities.paperReviewDraft.filter('read')).merge({
		where: { paperId, reviewerId: ctx.mustBeLoggedIn().sub }
	}).query.single;

const OVERWRITE_DESCRIPTION =
	'Replaces a draft the reviewer changed in the app, which is refused with CONFLICT otherwise. Set it only after the reviewer said their changes may go.';

const SavedPaperReviewDraft = schemaBuilder.simpleObject('SavedPaperReviewDraft', {
	fields: (t) => ({
		draftId: t.string(),
		paperVersion: t.int({ description: 'The version of the paper the draft was written for.' }),
		link: t.string({
			description: "Opens the paper with the draft in the reviewer's review editor."
		}),
		unmatchedQuotes: t.stringList({
			description:
				'The quotes (`>` lines) that do not stand word for word in one paragraph of that version, so "Find in paper" will not find them. A warning: the draft is saved all the same.'
		})
	})
});

schemaBuilder.mutationFields((t) => ({
	upsertPaperReviewDraft: t.field({
		description:
			"Writes the caller's review draft of a paper, replacing the one there is: a review prepared for the reviewer, who reads it in the review editor, changes it and sends it there. A draft is the reviewer's alone. It does not reach the paper's authors, sends no mail, changes no status and counts as no review; it can only be sent in the app. `content` is Markdown: paragraphs, **bold**, *italic*, lists, `##` headings and `> quotes`. A quote is taken literally, one paragraph each, and should be the paper's exact words so that \"Find in paper\" finds it; the answer lists those it would not find. For whoever may review the paper (NOT_FOUND otherwise), CONFLICT for a paper that is still a draft.",
		type: SavedPaperReviewDraft,
		args: {
			paperId: t.arg.id({ required: true }),
			content: t.arg
				.string({ required: true, description: 'The review as Markdown.' })
				.validate(reviewDraftMarkdownSchema),
			statusAfter: t
				.arg({
					type: paperStatusEnum,
					required: true,
					description: 'The verdict to propose: ACCEPTED or CHANGES_REQUESTED.'
				})
				.validate(reviewVerdictSchema),
			overwriteAppEdits: t.arg.boolean({ required: false, description: OVERWRITE_DESCRIPTION })
		},
		extensions: mcpTool({ textArguments: ['content'], idempotent: true }),
		resolve: async (_root, args, ctx) => {
			const { reviewerId } = await assertCanReviewPaper({ ctx, paperId: args.paperId });
			const saved = await saveAssistantReviewDraft({
				paperId: args.paperId,
				reviewerId,
				markdown: args.content,
				statusAfter: args.statusAfter,
				overwriteAppEdits: args.overwriteAppEdits ?? false
			});
			return {
				draftId: saved.id,
				paperVersion: saved.paperVersion,
				link: reviewDraftLink({
					origin: ctx.requestUrl().origin,
					conferenceId: saved.conferenceId,
					paperId: args.paperId
				}),
				unmatchedQuotes: saved.unmatchedQuotes
			};
		}
	}),

	savePaperReviewDraft: t.drizzleField({
		description:
			"Saves the caller's review draft of a paper as the review editor holds it, creating it on the first change; a draft written by an assistant keeps the version it was written for. For whoever may review the paper (NOT_FOUND otherwise), CONFLICT for a paper that is still a draft.",
		type: PaperReviewDraftRef,
		args: {
			paperId: t.arg.id({ required: true }),
			comments: t.arg({ type: 'JSON', required: true }).validate(editorDocumentSchema),
			statusAfter: t.arg({ type: paperStatusEnum, required: true }).validate(reviewVerdictSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const { reviewerId } = await assertCanReviewPaper({ ctx, paperId: args.paperId });
			await saveReviewDraft({
				paperId: args.paperId,
				reviewerId,
				comments: args.comments,
				statusAfter: args.statusAfter,
				by: writtenBy(ctx)
			});
			return db.query.paperReviewDraft
				.findFirst(query(await ownDraft({ ctx, paperId: args.paperId })))
				.then(assertFindFirstExists);
		}
	}),

	deletePaperReviewDraft: t.field({
		description:
			"Deletes the caller's review draft of a paper; false when there was none. For whoever may review the paper (NOT_FOUND otherwise).",
		type: 'Boolean',
		args: {
			paperId: t.arg.id({ required: true }),
			overwriteAppEdits: t.arg.boolean({ required: false, description: OVERWRITE_DESCRIPTION })
		},
		extensions: mcpTool(),
		resolve: async (_root, args, ctx) => {
			const { reviewerId } = await assertCanReviewPaper({ ctx, paperId: args.paperId });
			return deleteReviewDraft({
				paperId: args.paperId,
				reviewerId,
				by: writtenBy(ctx),
				overwriteAppEdits: args.overwriteAppEdits ?? false
			});
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	myPaperReviewDraft: t.drizzleField({
		description:
			"The caller's own review draft of a paper, null when there is none. Nobody reads another's draft.",
		type: PaperReviewDraftRef,
		nullable: true,
		smartSubscription: true,
		subscribe: listenToDrafts,
		args: { paperId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) =>
			(await db.query.paperReviewDraft.findFirst(
				query(await ownDraft({ ctx, paperId: args.paperId }))
			)) ?? null
	}),

	myPaperReviewDrafts: t.drizzleField({
		description: "The caller's own review drafts of a conference's papers, newest first.",
		type: [PaperReviewDraftRef],
		smartSubscription: true,
		subscribe: listenToDrafts,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) =>
			db.query.paperReviewDraft.findMany(
				query({
					...(await ctx.abilities.paperReviewDraft.filter('read')).merge({
						where: {
							reviewerId: ctx.mustBeLoggedIn().sub,
							paper: { delegation: { conferenceId: args.conferenceId } }
						}
					}).query.many,
					orderBy: { updatedAt: 'desc' }
				})
			)
	})
}));
