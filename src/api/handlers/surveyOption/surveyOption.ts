import { db, schema } from '$api/db/db';
import { object, query, schemaBuilder } from '$api/rumble';
import {
	assertCanCreateSurveyOption,
	deletableSurveyOptionWhere,
	registerSurveyOptionAbilities,
	updatableSurveyOptionWhere
} from './surveyOptionPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { surveyOptionPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

registerSurveyOptionAbilities();

const SurveyOptionRef = object({
	table: 'surveyOption',
	adjust: (t) => ({
		/** How many participants picked this option - the survey result, in effect. */
		countSurveyAnswers: t.field({
			type: 'Int',
			resolve: async (option) =>
				(
					await db.query.surveyAnswer.findMany({
						where: { optionId: option.id },
						columns: { id: true }
					})
				).length
		})
	})
});
query({ table: 'surveyOption' });

schemaBuilder.mutationFields((t) => ({
	createSurveyOption: t.drizzleField({
		type: SurveyOptionRef,
		args: {
			questionId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			description: t.arg.string({ required: true }),
			// NOT NULL with no default in the schema, so it is required at creation time.
			upperLimit: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateSurveyOption(ctx, args.questionId);

			const created = await db
				.insert(schema.surveyOption)
				.values({
					questionId: args.questionId,
					title: args.title,
					description: args.description,
					upperLimit: args.upperLimit
				})
				.returning()
				.then(assertFirstEntryExists);

			surveyOptionPubsub.created();

			return db.query.surveyOption
				.findFirst(
					query(
						(await ctx.abilities.surveyOption.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateSurveyOption: t.drizzleField({
		type: SurveyOptionRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			description: t.arg.string(),
			upperLimit: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.surveyOption)
				.set({
					title: args.title ?? undefined,
					description: args.description ?? undefined,
					upperLimit: args.upperLimit ?? undefined
				})
				.where(await updatableSurveyOptionWhere(ctx, args.id));

			surveyOptionPubsub.updated(args.id);

			return db.query.surveyOption
				.findFirst(
					query(
						(await ctx.abilities.surveyOption.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyOption: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.surveyOption)
				.where(await deletableSurveyOptionWhere(ctx, args.id))
				.returning({ id: schema.surveyOption.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			surveyOptionPubsub.removed();

			return true;
		}
	})
}));
