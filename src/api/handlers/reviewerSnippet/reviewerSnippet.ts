import { db, schema } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	assertCanUpdateReviewerSnippet,
	registerReviewerSnippetAbilities
} from './reviewerSnippetPermissions';
import { reviewerSnippetPubsub } from '#api/pubsub';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerReviewerSnippetAbilities();

const ReviewerSnippetRef = object({ table: 'reviewerSnippet' });
query({ table: 'reviewerSnippet' });

/**
 * Snippet names are unique per user, so create rejects a duplicate rather than relying on the
 * database constraint - the legacy resolver did the same, for a clearer error.
 *
 * Ownership is enforced through the ability filter rather than a hand-written `userId` check:
 * the rule in `reviewerSnippetPermissions.ts` already restricts every action to the caller's own
 * snippets.
 */
schemaBuilder.mutationFields((t) => ({
	createReviewerSnippet: t.drizzleField({
		type: ReviewerSnippetRef,
		args: {
			name: t.arg.string({ required: true }),
			content: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const id = ctx.mustBeLoggedIn().sub;

			const existing = await db.query.reviewerSnippet.findFirst({
				where: { userId: id, name: args.name }
			});
			if (existing) {
				throw apiError({ code: 'CONFLICT', message: m.snippetNameTaken() });
			}

			const created = await db
				.insert(schema.reviewerSnippet)
				.values({ name: args.name, content: args.content, userId: id })
				.returning()
				.then(assertFirstEntryExists);

			reviewerSnippetPubsub.created();

			return db.query.reviewerSnippet
				.findFirst(
					query(
						(await ctx.abilities.reviewerSnippet.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateReviewerSnippet: t.drizzleField({
		description: 'Changes the given fields of a snippet; the others stay as they are.',
		type: ReviewerSnippetRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			content: t.arg({ type: 'JSON' })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateReviewerSnippet({ ctx, id: args.id });
			await db
				.update(schema.reviewerSnippet)
				// Neither is ever null in the table: null leaves it as it is, like undefined.
				.set({
					name: args.name ?? undefined,
					content: args.content ?? undefined,
					updatedAt: new Date()
				})
				.where(whereRows({ table: schema.reviewerSnippet, filter: { id: args.id } }));

			reviewerSnippetPubsub.updated(args.id);

			return db.query.reviewerSnippet
				.findFirst(
					query(
						(await ctx.abilities.reviewerSnippet.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteReviewerSnippet: t.field({
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
		description:
			"The caller's own snippets. Scoping comes from the ability, which already restricts to them.",
		type: [ReviewerSnippetRef],
		resolve: async (query, _root, _args, ctx) => {
			ctx.mustBeLoggedIn();
			return db.query.reviewerSnippet.findMany(
				query({
					...(await ctx.abilities.reviewerSnippet.filter('read')).query.many,
					orderBy: { name: 'asc' }
				})
			);
		}
	})
}));
