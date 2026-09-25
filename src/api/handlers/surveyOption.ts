import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	assertMayManageSurveyQuestion,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/surveyOption.ts
abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when(systemAdmin);

// Logged-in users only, as above.
abilityBuilder.surveyOption.allow('read').when((ctx) => (userId(ctx) ? 'allow' : undefined));

// Scoped through the question, which carries the conference.
abilityBuilder.surveyOption.allow(['read', 'update', 'delete']).when((ctx) => {
	const question = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return question ? { where: { question } } : undefined;
});

export const SurveyOptionRef = object({ table: 'surveyOption' });
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
			await assertMayManageSurveyQuestion(args.questionId, ctx.oidc.user?.sub);

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

			return db.query.surveyOption
				.findFirst(
					query(
						ctx.abilities.surveyOption.filter('read').merge({ where: { id: created.id } }).query
							.single
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
				.where(
					ctx.abilities.surveyOption.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.surveyOption
				.findFirst(
					query(
						ctx.abilities.surveyOption.filter('read').merge({ where: { id: args.id } }).query.single
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
				.where(
					ctx.abilities.surveyOption.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.surveyOption.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Survey option not found, or not yours to delete');
			}
			return true;
		}
	})
}));
