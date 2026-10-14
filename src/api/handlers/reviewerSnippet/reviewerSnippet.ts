import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { systemAdmin, userId } from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { reviewerSnippetPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/reviewerSnippet.ts: users manage only their own snippets.
abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when(systemAdmin);

abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { userId: id } } : undefined;
});

const ReviewerSnippetRef = object({ table: 'reviewerSnippet' });
query({ table: 'reviewerSnippet' });

/**
 * Snippet names are unique per user, so create rejects a duplicate rather than relying on the
 * database constraint - the legacy resolver did the same, for a clearer error.
 *
 * Ownership is enforced through the ability filter rather than a hand-written `userId` check:
 * the rule in this file already restricts every action to the caller's own snippets.
 */
schemaBuilder.mutationFields((t) => ({
	createReviewerSnippet: t.drizzleField({
		type: ReviewerSnippetRef,
		args: {
			name: t.arg.string({ required: true }),
			content: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}

			const existing = await db.query.reviewerSnippet.findFirst({
				where: { userId: id, name: args.name }
			});
			if (existing) {
				throw apiError('CONFLICT', m.snippetNameTaken());
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
		type: ReviewerSnippetRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			content: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const updated = await db
				.update(schema.reviewerSnippet)
				.set({ name: args.name, content: args.content })
				.where(
					(await ctx.abilities.reviewerSnippet.filter('update')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({ id: schema.reviewerSnippet.id });

			if (updated.length === 0) {
				throw apiError('NOT_FOUND', m.snippetNotFound());
			}

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
			const deleted = await db
				.delete(schema.reviewerSnippet)
				.where(
					(await ctx.abilities.reviewerSnippet.filter('delete')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({ id: schema.reviewerSnippet.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.snippetNotFound());
			}
			reviewerSnippetPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	/** The caller's own snippets. Scoping comes from the ability, which already restricts to them. */
	myReviewerSnippets: t.drizzleField({
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
