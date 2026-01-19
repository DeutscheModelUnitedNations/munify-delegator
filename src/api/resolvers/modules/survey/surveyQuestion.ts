import {
	createOneSurveyQuestionMutationObject,
	deleteOneSurveyQuestionMutationObject,
	findManySurveyQuestionQueryObject,
	findUniqueSurveyQuestionQueryObject,
	SurveyQuestionConferenceFieldObject,
	SurveyQuestionDeadlineFieldObject,
	SurveyQuestionDescriptionFieldObject,
	SurveyQuestionIdFieldObject,
	SurveyQuestionTitleFieldObject,
	updateOneSurveyQuestionMutationObject
} from '$db/generated/graphql/SurveyQuestion';
import { SurveyQuestionDraftFieldObject } from '$db/generated/graphql/SurveyQuestion/object.base';
import { builder } from '../../builder';
import { db } from '$db/db';

builder.prismaObject('SurveyQuestion', {
	fields: (t) => ({
		id: t.field(SurveyQuestionIdFieldObject),
		title: t.field(SurveyQuestionTitleFieldObject),
		description: t.field(SurveyQuestionDescriptionFieldObject),
		deadline: t.field(SurveyQuestionDeadlineFieldObject),
		draft: t.field(SurveyQuestionDraftFieldObject),
		conference: t.relation('conference', SurveyQuestionConferenceFieldObject),
		options: t.relation('options', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SurveyOption
			})
		}),
		surveyAnswers: t.relation('surveyAnswers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SurveyAnswer
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManySurveyQuestionQueryObject(t);
	return {
		findManySurveyQuestions: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').SurveyQuestion]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueSurveyQuestionQueryObject(t);
	return {
		findUniqueSurveyQuestion: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').SurveyQuestion]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneSurveyQuestionMutationObject(t);
	return {
		createOneSurveyQuestion: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				// Verify user is team member with appropriate role for this conference
				const conferenceId = args.data.conferenceId;
				if (!conferenceId) {
					throw new Error('Conference ID is required');
				}

				const teamMember = await db.teamMember.findFirst({
					where: {
						conferenceId,
						userId: user.sub,
						role: { in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'] }
					}
				});

				if (!teamMember) {
					throw new Error('Access denied - requires team member status');
				}

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneSurveyQuestionMutationObject(t);
	return {
		updateOneSurveyQuestion: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').SurveyQuestion]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneSurveyQuestionMutationObject(t);
	return {
		deleteOneSurveyQuestion: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').SurveyQuestion]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
