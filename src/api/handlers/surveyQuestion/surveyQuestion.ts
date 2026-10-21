import { db, schema } from '$api/db/db';
import { object, query, schemaBuilder } from '$api/rumble';
import {
	assertCanCreateSurveyQuestion,
	deletableSurveyQuestionWhere,
	registerSurveyQuestionAbilities,
	updatableSurveyQuestionWhere
} from './surveyQuestionPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { nullToUndefined } from '$api/services/args';
import { surveyQuestionPubsub } from '$api/pubsub';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

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
				.findFirst(
					query(
						(await ctx.abilities.surveyQuestion.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
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
				.where(await updatableSurveyQuestionWhere(ctx, args.id));

			surveyQuestionPubsub.updated(args.id);

			return db.query.surveyQuestion
				.findFirst(
					query(
						(await ctx.abilities.surveyQuestion.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyQuestion: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.surveyQuestion)
				.where(await deletableSurveyQuestionWhere(ctx, args.id))
				.returning({ id: schema.surveyQuestion.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			surveyQuestionPubsub.removed();

			return true;
		}
	})
}));
