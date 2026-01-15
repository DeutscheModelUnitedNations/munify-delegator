import { db } from '$db/db';
import {
	createOneSurveyOptionMutationObject,
	deleteOneSurveyOptionMutationObject,
	findManySurveyOptionQueryObject,
	findUniqueSurveyOptionQueryObject,
	SurveyOptionDescriptionFieldObject,
	SurveyOptionIdFieldObject,
	SurveyOptionQuestionFieldObject,
	SurveyOptionTitleFieldObject,
	SurveyOptionUpperLimitFieldObject,
	updateOneSurveyOptionMutationObject
} from '$db/generated/graphql/SurveyOption';
import { builder } from '../../builder';

builder.prismaObject('SurveyOption', {
	fields: (t) => ({
		id: t.field(SurveyOptionIdFieldObject),
		title: t.field(SurveyOptionTitleFieldObject),
		description: t.field(SurveyOptionDescriptionFieldObject),
		upperLimit: t.field(SurveyOptionUpperLimitFieldObject),
		question: t.relation('question', SurveyOptionQuestionFieldObject),
		surveyAnswers: t.relation('surveyAnswers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SurveyAnswer
			})
		}),
		countSurveyAnswers: t.field({
			type: 'Int',
			resolve: async (parent, _args, ctx) => {
				const count = await db.surveyAnswer.count({
					where: {
						optionId: parent.id
					}
				});
				return count;
			}
		})
	})
});

builder.queryFields((t) => {
	const field = findManySurveyOptionQueryObject(t);
	return {
		findManySurveyOptions: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').SurveyOption]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueSurveyOptionQueryObject(t);
	return {
		findUniqueSurveyOption: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').SurveyOption]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneSurveyOptionMutationObject(t);
	return {
		createOneSurveyOption: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				// Get the question to find its conference
				const questionId = args.data.questionId;
				if (!questionId) {
					throw new Error('Question ID is required');
				}

				const question = await db.surveyQuestion.findUnique({
					where: { id: questionId }
				});

				if (!question) {
					throw new Error('Survey question not found');
				}

				// Verify user is team member with appropriate role
				const teamMember = await db.teamMember.findFirst({
					where: {
						conferenceId: question.conferenceId,
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
	const field = updateOneSurveyOptionMutationObject(t);
	return {
		updateOneSurveyOption: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').SurveyOption]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneSurveyOptionMutationObject(t);
	return {
		deleteOneSurveyOption: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').SurveyOption]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
