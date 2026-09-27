import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isSystemAdmin,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';

// Ported from abilities/entities/surveyAnswer.ts
abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users read and update their own answers (no delete, matching the CASL rule).
abilityBuilder.surveyAnswer.allow(['read', 'update']).when((ctx) => {
	const where = isOwnUser(ctx);
	return where ? { where } : undefined;
});

// Participant care and project management manage their conference's answers.
abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when((ctx) => {
	const question = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return question ? { where: { question } } : undefined;
});

export const SurveyAnswerRef = object({ table: 'surveyAnswer' });
query({ table: 'surveyAnswer' });
const pubsub = rumblePubsub({ table: 'surveyAnswer' });

/**
 * Answering a survey is a single mutation: there is no separate create, because the first answer
 * to a question and every later change to it are the same action from the participant's side.
 */
schemaBuilder.mutationFields((t) => ({
	updateSurveyAnswer: t.drizzleField({
		type: SurveyAnswerRef,
		args: {
			/** Either the answer's own id, or the question and user it belongs to. */
			id: t.arg.id(),
			questionId: t.arg.id(),
			userId: t.arg.id(),
			optionId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn();

			if (!args.id && (!args.questionId || !args.userId)) {
				throw new GraphQLError('You must provide either an id or a userId and questionId');
			}

			const option = await db.query.surveyOption
				.findFirst({
					where: { id: args.optionId },
					with: {
						question: true,
						surveyAnswers: { columns: { id: true } }
					}
				})
				.then(assertFindFirstExists);

			// Organizers may overfill an option and answer past the deadline; participants may not.
			const isOrganizer =
				isSystemAdmin(ctx) ||
				(await db.query.teamMember.findFirst({
					where: {
						conferenceId: option.question.conferenceId,
						userId: caller.sub,
						role: { in: [...PARTICIPANT_CARE_ROLES] }
					}
				})) !== undefined;

			if (!isOrganizer) {
				if (option.upperLimit && option.surveyAnswers.length >= option.upperLimit) {
					throw new GraphQLError(m.optionUpperLimitReached(option.upperLimit));
				}
				if (option.question.deadline < new Date()) {
					throw new GraphQLError(m.questionDeadlinePassed());
				}
			}

			const existing = await db.query.surveyAnswer.findFirst({
				...ctx.abilities.surveyAnswer.filter('update').merge({
					where: args.id
						? { id: args.id }
						: { questionId: args.questionId ?? undefined, userId: args.userId ?? undefined }
				}).query.single,
				columns: { id: true }
			});

			const answerId = existing
				? (
						await db
							.update(schema.surveyAnswer)
							.set({ optionId: args.optionId })
							.where(eq(schema.surveyAnswer.id, existing.id))
							.returning({ id: schema.surveyAnswer.id })
					)[0].id
				: (
						await db
							.insert(schema.surveyAnswer)
							.values({
								questionId: args.questionId ?? option.questionId,
								userId: args.userId ?? caller.sub,
								optionId: args.optionId
							})
							// Two tabs answering at once would otherwise collide on the unique index.
							.onConflictDoUpdate({
								target: [schema.surveyAnswer.questionId, schema.surveyAnswer.userId],
								set: { optionId: args.optionId }
							})
							.returning({ id: schema.surveyAnswer.id })
					)[0].id;

			// An upsert, so one notification on whichever row ended up holding the answer.
			pubsub.updated(answerId);

			return db.query.surveyAnswer
				.findFirst(
					query(
						ctx.abilities.surveyAnswer.filter('read').merge({ where: { id: answerId } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
