import { type Transaction, db, schema } from '#api/db/db.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { and, count, eq, inArray, ne } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';
import { distributeToOptions } from './surveyDistribution';

/** Locks the options, so answers given at the same time cannot both take an option's last seat. */
async function lockOptions(tx: Transaction, optionIds: string[]) {
	await tx
		.select({ id: schema.surveyOption.id })
		.from(schema.surveyOption)
		.where(inArray(schema.surveyOption.id, optionIds))
		.for('update');
}

/**
 * Organizers may overfill an option and answer past the deadline; participants may not. The
 * person's own answer does not count against the option, so picking it again is never refused.
 */
async function assertOptionOpen(
	tx: Transaction,
	option: { id: string; upperLimit: number; question: { deadline: Date } },
	participantId: string
) {
	if (option.question.deadline < new Date()) {
		throw apiError('CONFLICT', m.questionDeadlinePassed());
	}
	// 0 stands for no limit
	if (!option.upperLimit) return;
	await lockOptions(tx, [option.id]);
	const [{ taken }] = await tx
		.select({ taken: count() })
		.from(schema.surveyAnswer)
		.where(
			and(
				eq(schema.surveyAnswer.optionId, option.id),
				ne(schema.surveyAnswer.conferenceParticipantId, participantId)
			)
		);
	if (taken >= option.upperLimit) {
		throw apiError('CONFLICT', m.optionUpperLimitReached(option.upperLimit));
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
			with: { question: true }
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
	return db.transaction(async (tx) => {
		if (!answer.ignoresLimits) {
			await assertOptionOpen(tx, option, answer.subjectParticipantId);
		}

		const answerId = answer.updatableAnswerId
			? (
					await tx
						.update(schema.surveyAnswer)
						.set({ optionId: option.id })
						.where(eq(schema.surveyAnswer.id, answer.updatableAnswerId))
						.returning({ id: schema.surveyAnswer.id })
				)[0].id
			: (
					await tx
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
	});
}

/**
 * The options of a question, by id. A changed answer moves a count from one of them to another,
 * and an option in a live result only hears an update named with its own id.
 */
export async function optionIdsOfQuestion(questionId: string) {
	const options = await db.query.surveyOption.findMany({
		where: { questionId },
		columns: { id: true }
	});
	return options.map((option) => option.id);
}

/**
 * Gives everybody who holds a seat in the question's conference and has not answered it yet an
 * option that still has room (`distributeToOptions`). Those for whom no option has room are left
 * without an answer. Returns the options and how many answers were written.
 */
export async function distributeUnansweredSurvey(questionId: string) {
	return db.transaction(async (tx) => {
		const question = await tx.query.surveyQuestion
			.findFirst({ where: { id: questionId }, columns: { conferenceId: true } })
			.then(assertFindFirstExists);
		const options = await tx.query.surveyOption.findMany({
			where: { questionId },
			columns: { id: true, upperLimit: true }
		});
		if (options.length === 0) return { optionIds: [], assigned: 0 };
		await lockOptions(
			tx,
			options.map((option) => option.id)
		);

		const [taken, unanswered] = await Promise.all([
			tx
				.select({ optionId: schema.surveyAnswer.optionId, taken: count() })
				.from(schema.surveyAnswer)
				.where(eq(schema.surveyAnswer.questionId, questionId))
				.groupBy(schema.surveyAnswer.optionId),
			// The same people the results page lists as not having answered: those holding a seat.
			tx.query.conferenceParticipant.findMany({
				where: {
					conferenceId: question.conferenceId,
					OR: [
						{ delegationMember: { delegation: { assignedRoleId: { isNotNull: true } } } },
						{ singleParticipant: { assignedRoleId: { isNotNull: true } } }
					],
					NOT: { user: { surveyAnswers: { questionId } } }
				},
				columns: { id: true }
			})
		]);

		const plan = distributeToOptions(
			shuffled(unanswered.map((participant) => participant.id)),
			options.map((option) => ({
				id: option.id,
				upperLimit: option.upperLimit,
				taken: taken.find((row) => row.optionId === option.id)?.taken ?? 0
			}))
		);
		if (plan.length === 0) return { optionIds: options.map((o) => o.id), assigned: 0 };

		const inserted = await tx
			.insert(schema.surveyAnswer)
			.values(
				plan.map(({ participantId, optionId }) => ({
					questionId,
					conferenceParticipantId: participantId,
					optionId
				}))
			)
			// Somebody answering in the meantime keeps their own choice.
			.onConflictDoNothing({
				target: [schema.surveyAnswer.questionId, schema.surveyAnswer.conferenceParticipantId]
			})
			.returning({ id: schema.surveyAnswer.id });

		return { optionIds: options.map((o) => o.id), assigned: inserted.length };
	});
}

/** A copy of `items` in random order, so who is left over when seats run out is down to chance. */
function shuffled<T>(items: readonly T[]) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
