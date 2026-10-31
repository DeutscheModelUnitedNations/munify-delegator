import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { count } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import { distributeToOptions } from './surveyDistribution';
import { surveyAnswerPubsub, surveyOptionPubsub } from '#api/pubsub';

/** Locks the options, so answers given at the same time cannot both take an option's last seat. */
async function lockOptions({ tx, optionIds }: { tx: Transaction; optionIds: string[] }) {
	await tx
		.select({ id: schema.surveyOption.id })
		.from(schema.surveyOption)
		.where(whereRows({ table: schema.surveyOption, filter: { id: { in: optionIds } } }))
		.for('update');
}

/**
 * Organizers may overfill an option and answer past the deadline; participants may not. The
 * person's own answer does not count against the option, so picking it again is never refused.
 */
async function assertOptionOpen({
	tx,
	option,
	participantId
}: {
	tx: Transaction;
	option: { id: string; upperLimit: number; question: { deadline: Date } };
	participantId: string;
}) {
	if (option.question.deadline < new Date()) {
		throw apiError({ code: 'CONFLICT', message: m.questionDeadlinePassed() });
	}
	// 0 stands for no limit
	if (!option.upperLimit) return;
	await lockOptions({ tx, optionIds: [option.id] });
	const [{ taken }] = await tx
		.select({ taken: count() })
		.from(schema.surveyAnswer)
		.where(
			whereRows({
				table: schema.surveyAnswer,
				filter: {
					optionId: option.id,
					conferenceParticipantId: { ne: participantId }
				}
			})
		);
	if (taken >= option.upperLimit) {
		throw apiError({ code: 'CONFLICT', message: m.optionUpperLimitReached(option.upperLimit) });
	}
}

/**
 * Makes the option the person's answer to its question, replacing an earlier answer. Unless
 * `ignoresLimits` (participant care), a question past its deadline and a full option are refused
 * (CONFLICT). Returns the answer's id.
 */
export async function upsertSurveyAnswer({
	option,
	participantId,
	ignoresLimits
}: {
	option: {
		id: string;
		questionId: string;
		upperLimit: number;
		question: { deadline: Date };
	};
	participantId: string;
	ignoresLimits: boolean;
}) {
	const { answerId, optionIds } = await db.transaction(async (tx) => {
		if (!ignoresLimits) await assertOptionOpen({ tx, option, participantId });

		const { id: answerId } = await tx
			.insert(schema.surveyAnswer)
			.values({
				questionId: option.questionId,
				conferenceParticipantId: participantId,
				optionId: option.id
			})
			.onConflictDoUpdate({
				target: [schema.surveyAnswer.questionId, schema.surveyAnswer.conferenceParticipantId],
				set: { optionId: option.id, updatedAt: new Date() }
			})
			.returning({ id: schema.surveyAnswer.id })
			.then(assertFirstEntryExists);

		const optionIds = await optionIdsOfQuestion({ tx, questionId: option.questionId });
		return { answerId, optionIds };
	});
	// The answer may be new, which reaches list queries only as `created`
	surveyAnswerPubsub.created();
	surveyAnswerPubsub.updated(answerId);
	// The options show how many answers they hold: the one left and the one picked both change
	for (const optionId of optionIds) surveyOptionPubsub.updated(optionId);

	return answerId;
}

/** Takes back an answer, leaving the question unanswered for its person. */
export async function withdrawSurveyAnswer({
	answerId,
	questionId
}: {
	answerId: string;
	questionId: string;
}) {
	await db
		.delete(schema.surveyAnswer)
		.where(whereRows({ table: schema.surveyAnswer, filter: { id: answerId } }));
	surveyAnswerPubsub.removed();
	// The options show how many answers they hold
	for (const optionId of await optionIdsOfQuestion({ tx: db, questionId })) {
		surveyOptionPubsub.updated(optionId);
	}
}

/**
 * The options of a question, by id. A changed answer moves a count from one of them to another,
 * and an option in a live result only hears an update named with its own id.
 */
async function optionIdsOfQuestion({
	tx,
	questionId
}: {
	tx: Transaction | typeof db;
	questionId: string;
}) {
	const options = await tx.query.surveyOption.findMany({
		where: { questionId },
		columns: { id: true }
	});
	return options.map((option) => option.id);
}

/**
 * Gives everybody who holds a seat in the question's conference and has not answered it yet an
 * option that still has room (`distributeToOptions`). Those for whom no option has room are left
 * without an answer. Returns how many answers were written.
 */
export async function distributeUnansweredSurvey(questionId: string) {
	const { written, optionIds } = await db.transaction(async (tx) => {
		const nothing = { written: 0, optionIds: [] };
		const question = await tx.query.surveyQuestion
			.findFirst({ where: { id: questionId }, columns: { conferenceId: true } })
			.then(assertFindFirstExists);
		const options = await tx.query.surveyOption.findMany({
			where: { questionId },
			columns: { id: true, upperLimit: true }
		});
		if (options.length === 0) return nothing;
		await lockOptions({ tx, optionIds: options.map((option) => option.id) });

		const [taken, unanswered] = await Promise.all([
			tx
				.select({ optionId: schema.surveyAnswer.optionId, taken: count() })
				.from(schema.surveyAnswer)
				.where(whereRows({ table: schema.surveyAnswer, filter: { questionId } }))
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

		const plan = distributeToOptions({
			participantIds: shuffled(unanswered.map((participant) => participant.id)),
			options: options.map((option) => ({
				id: option.id,
				upperLimit: option.upperLimit,
				taken: taken.find((row) => row.optionId === option.id)?.taken ?? 0
			}))
		});
		if (plan.length === 0) return nothing;

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
		return { written: inserted.length, optionIds: options.map((option) => option.id) };
	});
	if (written > 0) {
		surveyAnswerPubsub.created();
		for (const optionId of optionIds) surveyOptionPubsub.updated(optionId);
	}

	return written;
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
