import { db } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	distributeUnansweredSurvey,
	upsertSurveyAnswer,
	withdrawSurveyAnswer
} from './surveyAnswerService';
import {
	assertCanAnswerSurvey,
	assertCanDeleteSurveyAnswer,
	assertCanDistributeSurvey,
	registerSurveyAnswerAbilities
} from './surveyAnswerPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

registerSurveyAnswerAbilities();

const SurveyAnswerRef = object({ table: 'surveyAnswer' });
query({ table: 'surveyAnswer' });

schemaBuilder.mutationFields((t) => ({
	// There is no separate create: the first answer to a question and every later change to it are
	// the same action from the participant's side.
	upsertSurveyAnswer: t.drizzleField({
		description:
			'Picks the option as the answer to its question, replacing an earlier answer. Participants answer for themselves only (FORBIDDEN otherwise) and are refused a full option and an answer past the deadline (CONFLICT); participant care answers for anybody in its conference, past both. NOT_FOUND for an option the caller cannot read, e.g. of a hidden question.',
		type: SurveyAnswerRef,
		args: {
			optionId: t.arg.id({ required: true }),
			userId: t.arg.id({
				description: 'Whose answer it is; left out, the caller’s own.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			const { option, participantId, ignoresLimits } = await assertCanAnswerSurvey({
				ctx,
				optionId: args.optionId,
				userId: args.userId
			});
			const answerId = await upsertSurveyAnswer({ option, participantId, ignoresLimits });

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
			'Takes back the answer to the question, leaving it unanswered: participants their own until the deadline, participant care anybody’s. NOT_FOUND when there is none the caller may take back.',
		type: 'Boolean',
		args: {
			questionId: t.arg.id({ required: true }),
			userId: t.arg.id({ description: 'Whose answer it is; left out, the caller’s own.' })
		},
		resolve: async (_root, args, ctx) => {
			const answer = await assertCanDeleteSurveyAnswer({
				ctx,
				questionId: args.questionId,
				userId: args.userId
			});
			await withdrawSurveyAnswer({ answerId: answer.id, questionId: answer.questionId });
			return true;
		}
	}),

	distributeUnansweredSurvey: t.field({
		description:
			'Answers the question for everybody holding a seat who has not answered it yet, with an option that still has room, so the options fill up evenly. Returns how many answers it gave; whoever found no room is left out. Participant care only (NOT_FOUND otherwise).',
		type: 'Int',
		args: { questionId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDistributeSurvey({ ctx, questionId: args.questionId });
			return distributeUnansweredSurvey(args.questionId);
		}
	})
}));
