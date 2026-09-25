import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageConference,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/surveyQuestion.ts
abilityBuilder.surveyQuestion.allow(['read', 'update', 'delete']).when(systemAdmin);

// Any logged-in user may read every question. Note this is NOT a blanket allow: the CASL rule
// sat inside `if (oidc?.user)`, so anonymous requests matched nothing.
abilityBuilder.surveyQuestion.allow('read').when((ctx) => (userId(ctx) ? 'allow' : undefined));

// Participant care and project management manage their conference's questions.
// Creation stays in the mutation resolver, as it did under CASL.
abilityBuilder.surveyQuestion.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

export const SurveyQuestionRef = object({ table: 'surveyQuestion' });
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
			await assertMayManageConference(args.conferenceId, ctx.oidc.user?.sub);

			const created = await db
				.insert(schema.surveyQuestion)
				.values({
					conferenceId: args.conferenceId,
					title: args.title,
					description: args.description,
					deadline: args.deadline,
					draft: args.draft ?? undefined,
					hidden: args.hidden ?? undefined,
					showSelectionOnDashboard: args.showSelectionOnDashboard ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.surveyQuestion
				.findFirst(
					query(
						ctx.abilities.surveyQuestion.filter('read').merge({ where: { id: created.id } }).query
							.single
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
					title: args.title ?? undefined,
					description: args.description ?? undefined,
					deadline: args.deadline ?? undefined,
					draft: args.draft ?? undefined,
					hidden: args.hidden ?? undefined,
					showSelectionOnDashboard: args.showSelectionOnDashboard ?? undefined
				})
				.where(
					ctx.abilities.surveyQuestion.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.surveyQuestion
				.findFirst(
					query(
						ctx.abilities.surveyQuestion.filter('read').merge({ where: { id: args.id } }).query
							.single
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
				.where(
					ctx.abilities.surveyQuestion.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.surveyQuestion.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Survey question not found, or not yours to delete');
			}
			return true;
		}
	})
}));
