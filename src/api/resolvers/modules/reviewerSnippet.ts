import {
	ReviewerSnippetIdFieldObject,
	ReviewerSnippetNameFieldObject,
	ReviewerSnippetContentFieldObject,
	ReviewerSnippetCreatedAtFieldObject,
	ReviewerSnippetUpdatedAtFieldObject
} from '$db/generated/graphql/ReviewerSnippet';
import { builder } from '../builder';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import { Json } from '$db/generated/graphql/inputs';

builder.prismaObject('ReviewerSnippet', {
	fields: (t) => ({
		id: t.field(ReviewerSnippetIdFieldObject),
		name: t.field(ReviewerSnippetNameFieldObject),
		content: t.field(ReviewerSnippetContentFieldObject),
		createdAt: t.field(ReviewerSnippetCreatedAtFieldObject),
		updatedAt: t.field(ReviewerSnippetUpdatedAtFieldObject)
	})
});

// Query: Get all snippets for current user
builder.queryFields((t) => ({
	myReviewerSnippets: t.prismaField({
		type: ['ReviewerSnippet'],
		resolve: async (query, _root, _args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			return db.reviewerSnippet.findMany({
				...query,
				where: { userId: user.sub },
				orderBy: { name: 'asc' }
			});
		}
	})
}));

// Mutations: Create, Update, Delete
builder.mutationFields((t) => ({
	createReviewerSnippet: t.prismaField({
		type: 'ReviewerSnippet',
		args: {
			name: t.arg.string({ required: true }),
			content: t.arg({ type: Json, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Check for duplicate name
			const existing = await db.reviewerSnippet.findUnique({
				where: { userId_name: { userId: user.sub, name: args.name } }
			});

			if (existing) {
				throw new GraphQLError('A snippet with this name already exists');
			}

			return db.reviewerSnippet.create({
				...query,
				data: {
					name: args.name,
					content: args.content as object,
					userId: user.sub
				}
			});
		}
	}),

	updateReviewerSnippet: t.prismaField({
		type: 'ReviewerSnippet',
		args: {
			id: t.arg.string({ required: true }),
			name: t.arg.string({ required: true }),
			content: t.arg({ type: Json, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify ownership
			const snippet = await db.reviewerSnippet.findUnique({
				where: { id: args.id }
			});

			if (!snippet || snippet.userId !== user.sub) {
				throw new GraphQLError('Snippet not found or access denied');
			}

			// Check if new name conflicts with existing snippet (excluding current)
			if (args.name !== snippet.name) {
				const existing = await db.reviewerSnippet.findUnique({
					where: { userId_name: { userId: user.sub, name: args.name } }
				});

				if (existing) {
					throw new GraphQLError('A snippet with this name already exists');
				}
			}

			return db.reviewerSnippet.update({
				...query,
				where: { id: args.id },
				data: {
					name: args.name,
					content: args.content as object
				}
			});
		}
	}),

	deleteReviewerSnippet: t.prismaField({
		type: 'ReviewerSnippet',
		args: {
			id: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify ownership
			const snippet = await db.reviewerSnippet.findUnique({
				where: { id: args.id }
			});

			if (!snippet || snippet.userId !== user.sub) {
				throw new GraphQLError('Snippet not found or access denied');
			}

			return db.reviewerSnippet.delete({
				...query,
				where: { id: args.id }
			});
		}
	})
}));
