import { db, schema } from '$api/db/db';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

/** Organizers may overfill an option and answer past the deadline; participants may not. */
function assertOptionOpen(option: {
	upperLimit: number | null;
	surveyAnswers: unknown[];
	question: { deadline: Date };
}) {
	if (option.upperLimit && option.surveyAnswers.length >= option.upperLimit) {
		throw apiError('CONFLICT', m.optionUpperLimitReached(option.upperLimit));
	}
	if (option.question.deadline < new Date()) {
		throw apiError('CONFLICT', m.questionDeadlinePassed());
	}
}

/**
 * The option an answer picks, with its question and the answers it holds. The answer has to be
 * addressed either by id or by question and user.
 */
export async function loadAnswerOption(args: {
	id?: string | null;
	questionId?: string | null;
	userId?: string | null;
	optionId: string;
}) {
	if (!args.id && (!args.questionId || !args.userId)) {
		throw apiError('INVALID_INPUT', m.surveyAnswerNeedsLookup());
	}

	return db.query.surveyOption
		.findFirst({
			where: { id: args.optionId },
			with: {
				question: true,
				surveyAnswers: { columns: { id: true } }
			}
		})
		.then(assertFindFirstExists);
}

/**
 * Stores the answer an option stands for, updating `updatableAnswerId` when given or creating it.
 * Reports whether a row existed, which decides what the caller publishes.
 */
export async function saveSurveyAnswer(
	option: Awaited<ReturnType<typeof loadAnswerOption>>,
	answer: {
		subjectParticipantId: string;
		ignoresLimits: boolean;
		updatableAnswerId: string | undefined;
	}
) {
	if (!answer.ignoresLimits) assertOptionOpen(option);

	const answerId = answer.updatableAnswerId
		? (
				await db
					.update(schema.surveyAnswer)
					.set({ optionId: option.id })
					.where(eq(schema.surveyAnswer.id, answer.updatableAnswerId))
					.returning({ id: schema.surveyAnswer.id })
			)[0].id
		: (
				await db
					.insert(schema.surveyAnswer)
					.values({
						questionId: option.questionId,
						conferenceParticipantId: answer.subjectParticipantId,
						optionId: option.id
					})
					// Two tabs answering at once would otherwise collide on the unique index.
					.onConflictDoUpdate({
						target: [schema.surveyAnswer.questionId, schema.surveyAnswer.conferenceParticipantId],
						set: { optionId: option.id }
					})
					.returning({ id: schema.surveyAnswer.id })
			)[0].id;

	return { answerId, existed: Boolean(answer.updatableAnswerId) };
}
