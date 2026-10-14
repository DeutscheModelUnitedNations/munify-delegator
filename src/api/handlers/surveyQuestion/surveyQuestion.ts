import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	isParticipantOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { nullToUndefined } from '$api/services/args';
import { surveyQuestionPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/surveyQuestion.ts
abilityBuilder.surveyQuestion.allow(['read', 'update', 'delete']).when(systemAdmin);

// Participants see the published questions of their own conferences - not drafts, and not the
// ones the organizers hid.
abilityBuilder.surveyQuestion.allow('read').when((ctx) => {
	const participant = isParticipantOfConference(ctx);
	return participant ? { where: { ...participant, draft: false, hidden: false } } : undefined;
});

// Participant care and project management manage their conference's questions.
// Creation stays in the mutation resolver, as it did under CASL.
abilityBuilder.surveyQuestion
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

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
				.where(
					(await ctx.abilities.surveyQuestion.filter('update')).merge({ where: { id: args.id } })
						.sql.where
				);

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
				.where(
					(await ctx.abilities.surveyQuestion.filter('delete')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({ id: schema.surveyQuestion.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			surveyQuestionPubsub.removed();

			return true;
		}
	})
}));
