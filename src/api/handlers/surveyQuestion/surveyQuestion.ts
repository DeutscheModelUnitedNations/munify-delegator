import { db, schema } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	assertCanCreateSurveyQuestion,
	registerSurveyQuestionAbilities
} from './surveyQuestionPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { nullToUndefined } from '#api/services/args';
import { surveyQuestionPubsub } from '#api/pubsub';
import {
	deleteAllowedRow,
	assertUpdated,
	allowedRowWhere,
	readableById
} from '#api/services/authHelper';

registerSurveyQuestionAbilities();

const SurveyQuestionRef = object({ table: 'surveyQuestion' });
query({ table: 'surveyQuestion' });

schemaBuilder.mutationFields((t) => ({
	createSurveyQuestion: t.drizzleField({
		type: SurveyQuestionRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			description: t.arg.string({ required: true }),
			deadline: t.arg({ type: 'DateTime', required: true }),
			draft: t.arg.boolean(),
			hidden: t.arg.boolean(),
			showSelectionOnDashboard: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateSurveyQuestion(ctx, args.conferenceId);

			const created = await db
				.insert(schema.surveyQuestion)
				.values({
					conferenceId: args.conferenceId,
					title: args.title,
					description: args.description,
					deadline: args.deadline,
					draft: nullToUndefined(args.draft),
					hidden: nullToUndefined(args.hidden),
					showSelectionOnDashboard: nullToUndefined(args.showSelectionOnDashboard)
				})
				.returning()
				.then(assertFirstEntryExists);

			surveyQuestionPubsub.created();

			return db.query.surveyQuestion
				.findFirst(query(await readableById(ctx.abilities.surveyQuestion, created.id)))
				.then(assertFindFirstExists);
		}
	}),

	updateSurveyQuestion: t.drizzleField({
		type: SurveyQuestionRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			description: t.arg.string(),
			deadline: t.arg({ type: 'DateTime' }),
			draft: t.arg.boolean(),
			hidden: t.arg.boolean(),
			showSelectionOnDashboard: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			assertUpdated(
				await db
					.update(schema.surveyQuestion)
					.set({
						title: nullToUndefined(args.title),
						description: nullToUndefined(args.description),
						deadline: nullToUndefined(args.deadline),
						draft: nullToUndefined(args.draft),
						hidden: nullToUndefined(args.hidden),
						showSelectionOnDashboard: nullToUndefined(args.showSelectionOnDashboard)
					})
					.where(await allowedRowWhere(ctx, 'surveyQuestion', 'update', args.id))
					.returning({ id: schema.surveyQuestion.id })
			);

			surveyQuestionPubsub.updated(args.id);

			return db.query.surveyQuestion
				.findFirst(query(await readableById(ctx.abilities.surveyQuestion, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyQuestion: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteAllowedRow(ctx, 'surveyQuestion', args.id);
			surveyQuestionPubsub.removed();

			return true;
		}
	})
}));
