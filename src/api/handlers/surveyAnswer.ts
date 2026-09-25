import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';

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

/** Only update: the live schema exposes no create or delete for survey answers. */
schemaBuilder.mutationFields((t) => ({
	updateSurveyAnswer: t.drizzleField({
		type: SurveyAnswerRef,
		args: {
			id: t.arg.id({ required: true }),
			optionId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.surveyAnswer)
				.set({ optionId: args.optionId })
				.where(
					ctx.abilities.surveyAnswer.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.surveyAnswer
				.findFirst(
					query(
						ctx.abilities.surveyAnswer.filter('read').merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
