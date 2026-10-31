import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	distributeUnansweredSurvey,
	loadAnswerOption,
	optionIdsOfQuestion,
	saveSurveyAnswer
} from './surveyAnswerService';
import {
	assertCanAnswerSurvey,
	assertCanDeleteSurveyAnswer,
	assertCanDistributeSurvey,
	registerSurveyAnswerAbilities
} from './surveyAnswerPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { surveyAnswerPubsub, surveyOptionPubsub } from '#api/pubsub';
import { queryAllowed } from '#api/services/authHelper/utils';

registerSurveyAnswerAbilities();

const SurveyAnswerRef = object({ table: 'surveyAnswer' });
query({ table: 'surveyAnswer' });

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
			const option = await loadAnswerOption(args);
			const answer = await assertCanAnswerSurvey({ ctx, option, args });
			const { answerId, existed } = await saveSurveyAnswer({ option, answer });

			// A new row has to reach list queries (`created`), which an update of its id does not.
			if (existed) surveyAnswerPubsub.updated(answerId);
			else surveyAnswerPubsub.created();
			// The options show how many answers they hold: the one left and the one picked both change.
			for (const optionId of await optionIdsOfQuestion(option.questionId)) {
				surveyOptionPubsub.updated(optionId);
			}

			return db.query.surveyAnswer
				.findFirst(query(await queryAllowed({ ability: ctx.abilities.surveyAnswer, id: answerId })))
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Takes back the answer `userId` (by default the caller) gave to the question, leaving it
	 * unanswered for them.
	 */
	deleteSurveyAnswer: t.field({
		type: 'Boolean',
		args: { questionId: t.arg.id({ required: true }), userId: t.arg.id() },
		resolve: async (_root, args, ctx) => {
			const answer = await assertCanDeleteSurveyAnswer({ ctx, args });
			await db
				.delete(schema.surveyAnswer)
				.where(whereRows({ table: schema.surveyAnswer, filter: { id: answer.id } }));

			surveyAnswerPubsub.removed();
			for (const optionId of await optionIdsOfQuestion(answer.questionId)) {
				surveyOptionPubsub.updated(optionId);
			}
			return true;
		}
	}),

	/**
	 * Answers the question for everybody holding a seat who has not answered it yet, with an option
	 * that still has room. Returns how many answers it gave; whoever found no room is left out.
	 */
	distributeUnansweredSurvey: t.field({
		type: 'Int',
		args: { questionId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDistributeSurvey({ ctx, questionId: args.questionId });
			const { optionIds, assigned } = await distributeUnansweredSurvey(args.questionId);

			if (assigned > 0) {
				surveyAnswerPubsub.created();
				for (const optionId of optionIds) surveyOptionPubsub.updated(optionId);
			}
			return assigned;
		}
	})
}));
