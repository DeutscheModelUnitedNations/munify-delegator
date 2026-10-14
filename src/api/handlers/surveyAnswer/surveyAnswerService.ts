import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertParticipantsOf,
	hasTeamRole
} from '$api/services/authHelper';
import type { Context } from '$api/context';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';

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
 * Stores the answer an option stands for, updating the one that exists or creating it. Reports
 * whether a row existed, which decides what the caller publishes.
 */
export async function saveSurveyAnswer(
	ctx: ApiContext,
	args: { id?: string | null; questionId?: string | null; userId?: string | null; optionId: string }
) {
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

	return { answerId, existed: Boolean(existing) };
}
