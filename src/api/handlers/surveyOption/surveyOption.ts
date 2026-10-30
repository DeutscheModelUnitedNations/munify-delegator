import { db, schema } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	assertCanCreateSurveyOption,
	registerSurveyOptionAbilities
} from './surveyOptionPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { surveyOptionPubsub } from '#api/pubsub';
import { deleteIfAllowed, queryAllowed, updateIfAllowed } from '#api/services/authHelper/utils';

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
				.findFirst(query(await queryAllowed(ctx.abilities.surveyOption, created.id)))
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
			await updateIfAllowed(ctx, 'surveyOption', args.id, {
				title: args.title ?? undefined,
				description: args.description ?? undefined,
				upperLimit: args.upperLimit ?? undefined
			});

			surveyOptionPubsub.updated(args.id);

			return db.query.surveyOption
				.findFirst(query(await queryAllowed(ctx.abilities.surveyOption, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyOption: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed(ctx, 'surveyOption', args.id);
			surveyOptionPubsub.removed();

			return true;
		}
	})
}));
