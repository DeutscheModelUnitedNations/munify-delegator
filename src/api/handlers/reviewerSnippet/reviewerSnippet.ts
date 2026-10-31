import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanUpdateReviewerSnippet,
	registerReviewerSnippetAbilities
} from './reviewerSnippetPermissions';
import { createSnippet, snippetNameSchema, updateSnippet } from './reviewerSnippetService';
import { reviewerSnippetPubsub } from '#api/pubsub';
import { m } from '#lib/paraglide/messages';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerReviewerSnippetAbilities();

const ReviewerSnippetRef = object({ table: 'reviewerSnippet' });
query({ table: 'reviewerSnippet' });

/** The snippet with this id, as far as the caller may read it. */
const readableSnippet = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.reviewerSnippet.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createReviewerSnippet: t.drizzleField({
		description:
			'Saves a text block the caller reuses in paper reviews. A name the caller already uses is refused with CONFLICT.',
		type: ReviewerSnippetRef,
		args: {
			name: t.arg.string({ required: true }).validate(snippetNameSchema),
			content: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const id = await createSnippet({
				userId: ctx.mustBeLoggedIn().sub,
				name: args.name,
				content: args.content
			});

			return db.query.reviewerSnippet
				.findFirst(query(await readableSnippet({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateReviewerSnippet: t.drizzleField({
		description:
			"Changes the given fields of one of the caller's snippets; the others stay as they are, and `null` leaves one alone too. A name the caller already uses is refused with CONFLICT, another's snippet with NOT_FOUND.",
		type: ReviewerSnippetRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string().validate(snippetNameSchema.nullish()),
			content: t.arg({ type: 'JSON' })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateReviewerSnippet({ ctx, id: args.id });
			// Neither is ever null in the table: null leaves it as it is, like undefined.
			await updateSnippet({
				id: args.id,
				changes: { name: args.name ?? undefined, content: args.content ?? undefined }
			});

			return db.query.reviewerSnippet
				.findFirst(query(await readableSnippet({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteReviewerSnippet: t.field({
		description: "Deletes one of the caller's snippets; another's answers NOT_FOUND.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({
				ctx,
				table: 'reviewerSnippet',
				id: args.id,
				options: { message: m.snippetNotFound }
			});
			reviewerSnippetPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	myReviewerSnippets: t.drizzleField({
		description: "The caller's own snippets, by name.",
		type: [ReviewerSnippetRef],
		resolve: async (query, _root, _args, ctx) => {
			const userId = ctx.mustBeLoggedIn().sub;
			// Only the caller's own: a system admin reads everybody's, which are not theirs to use.
			return db.query.reviewerSnippet.findMany(
				query({
					...(await ctx.abilities.reviewerSnippet.filter('read')).merge({ where: { userId } }).query
						.many,
					orderBy: { name: 'asc' }
				})
			);
		}
	})
}));
