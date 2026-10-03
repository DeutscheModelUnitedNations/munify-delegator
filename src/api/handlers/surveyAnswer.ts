import { db, schema } from '$api/db/db';
import {
	type ApiContext,
	abilityBuilder,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertParticipantsOf,
	hasTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import type { Context } from '$api/context';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';

// Ported from abilities/entities/surveyAnswer.ts
abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users read and update their own answers (no delete, matching the CASL rule).
abilityBuilder.surveyAnswer.allow(['read', 'update']).when((ctx) => where(isOwnUser(ctx)));

// Participant care and project management manage their conference's answers.
abilityBuilder.surveyAnswer.allow(['read', 'update', 'delete']).when((ctx) => {
	const question = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return question ? { where: { question } } : undefined;
});

const SurveyAnswerRef = object({ table: 'surveyAnswer' });
query({ table: 'surveyAnswer' });
const pubsub = rumblePubsub({ table: 'surveyAnswer' });

/** Organizers may overfill an option and answer past the deadline; participants may not. */
function assertOptionOpen(option: {
	upperLimit: number | null;
	surveyAnswers: unknown[];
	question: { deadline: Date };
}) {
	if (option.upperLimit && option.surveyAnswers.length >= option.upperLimit) {
		throw new GraphQLError(m.optionUpperLimitReached(option.upperLimit));
	}
	if (option.question.deadline < new Date()) {
		throw new GraphQLError(m.questionDeadlinePassed());
	}
}

/**
 * Who an answer may be given for: participant care answers for anybody in its conference, and
 * everybody else only for themselves, in a conference they take part in, while the option is open.
 * Returns the user the answer belongs to.
 */
async function answeringFor(
	ctx: Context,
	option: Parameters<typeof assertOptionOpen>[0] & { question: { conferenceId: string } },
	requestedUserId: string | null | undefined
) {
	const caller = ctx.mustBeLoggedIn().sub;
	const conferenceId = option.question.conferenceId;
	const subject = requestedUserId ?? caller;

	if (await hasTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES)) {
		await assertParticipantsOf(conferenceId, [subject]);
		return subject;
	}
	if (subject !== caller) {
		throw new GraphQLError('You may only answer surveys for yourself');
	}
	await assertParticipantsOf(conferenceId, [subject]);
	assertOptionOpen(option);
	return subject;
}

/**
 * Whom an answer is for, checked: the user it names, or, addressed by id alone, whoever the
 * answer already belongs to. The question it names has to be the option's.
 */
async function answerSubject(
	ctx: ApiContext,
	option: Parameters<typeof answeringFor>[1] & { questionId: string },
	args: { id?: string | null; questionId?: string | null; userId?: string | null }
) {
	if (args.questionId && args.questionId !== option.questionId) {
		throw new GraphQLError('The option does not belong to this question');
	}
	const addressed = args.id
		? await db.query.surveyAnswer.findFirst({
				...(await ctx.abilities.surveyAnswer.filter('update')).merge({ where: { id: args.id } })
					.query.single,
				columns: { userId: true }
			})
		: undefined;
	return answeringFor(ctx, option, args.userId ?? addressed?.userId);
}

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

			const subject = await answerSubject(ctx, option, args);

			const existing = await db.query.surveyAnswer.findFirst({
				...(await ctx.abilities.surveyAnswer.filter('update')).merge({
					where: args.id
						? { id: args.id, questionId: option.questionId, userId: subject }
						: { questionId: option.questionId, userId: subject }
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
								questionId: option.questionId,
								userId: subject,
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
						(await ctx.abilities.surveyAnswer.filter('read')).merge({ where: { id: answerId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
