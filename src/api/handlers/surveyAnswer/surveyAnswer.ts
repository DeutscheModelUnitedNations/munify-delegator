import { db } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { saveSurveyAnswer } from './surveyAnswerService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { surveyAnswerPubsub, surveyOptionPubsub } from '$api/pubsub';

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
			const { answerId, existed } = await saveSurveyAnswer(ctx, args);

			// A new row has to reach list queries (`created`), which an update of its id does not.
			if (existed) surveyAnswerPubsub.updated(answerId);
			else surveyAnswerPubsub.created();
			// The options show how many answers they hold.
			surveyOptionPubsub.updated();

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
