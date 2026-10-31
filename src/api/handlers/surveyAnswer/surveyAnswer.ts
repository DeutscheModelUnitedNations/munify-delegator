import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	distributeUnansweredSurvey,
	answerLookupSchema,
	optionIdsOfQuestion,
	upsertSurveyAnswer
} from './surveyAnswerService';
import {
	assertCanAnswerSurvey,
	assertCanDeleteSurveyAnswer,
	assertCanDistributeSurvey,
	registerSurveyAnswerAbilities
} from './surveyAnswerPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { surveyAnswerPubsub, surveyOptionPubsub } from '#api/pubsub';

registerSurveyAnswerAbilities();

const SurveyAnswerRef = object({ table: 'surveyAnswer' });
query({ table: 'surveyAnswer' });

/**
 * Answering a survey is a single mutation: there is no separate create, because the first answer
 * to a question and every later change to it are the same action from the participant's side.
 */
schemaBuilder.mutationFields((t) => ({
	upsertSurveyAnswer: t.drizzleField({
		description:
			'Answers a survey question, or changes the answer. Participants are refused a full option and an answer after the deadline; the team is not.',
		type: SurveyAnswerRef,
		args: {
			/** Either the answer's own id, or the question and user it belongs to. */
			id: t.arg.id(),
			questionId: t.arg.id(),
			userId: t.arg.id(),
			optionId: t.arg.id({ required: true })
		},
		validate: answerLookupSchema,
		resolve: async (query, _root, args, ctx) => {
			const { option, answer } = await assertCanAnswerSurvey({ ctx, args });
			const answerId = await upsertSurveyAnswer({ option, answer });

			return db.query.surveyAnswer
				.findFirst(
					query(
						(await ctx.abilities.surveyAnswer.filter('read')).merge({ where: { id: answerId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyAnswer: t.field({
		description:
			'Takes back the answer `userId` (by default the caller) gave to the question, leaving it unanswered for them.',
		type: 'Boolean',
		args: { questionId: t.arg.id({ required: true }), userId: t.arg.id() },
		resolve: async (_root, args, ctx) => {
			const answer = await assertCanDeleteSurveyAnswer({ ctx, args });
			await db
				.delete(schema.surveyAnswer)
				.where(whereRows({ table: schema.surveyAnswer, filter: { id: answer.id } }));

			surveyAnswerPubsub.removed();
			for (const optionId of await optionIdsOfQuestion({
				tx: db,
				questionId: answer.questionId
			})) {
				surveyOptionPubsub.updated(optionId);
			}
			return true;
		}
	}),

	distributeUnansweredSurvey: t.field({
		description:
			'Answers the question for everybody holding a seat who has not answered it yet, with an option that still has room. Returns how many answers it gave; whoever found no room is left out.',
		type: 'Int',
		args: { questionId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDistributeSurvey({ ctx, questionId: args.questionId });
			return distributeUnansweredSurvey(args.questionId);
		}
	})
}));
