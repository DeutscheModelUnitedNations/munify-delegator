import { db } from '$db/db';
import {
	createOneSurveyAnswerMutationObject,
	findManySurveyAnswerQueryObject,
	findUniqueSurveyAnswerQueryObject,
	SurveyAnswerIdFieldObject,
	SurveyAnswerOptionFieldObject,
	SurveyAnswerQuestionFieldObject,
	SurveyAnswerUserFieldObject,
	updateOneSurveyAnswerMutationObject
} from '$db/generated/graphql/SurveyAnswer';
import type { nullable } from 'zod';
import { builder } from '../builder';
import { upsertWithRetry } from '$api/services/prismaUpsertWithRetry';

builder.prismaObject('SurveyAnswer', {
	fields: (t) => ({
		id: t.field(SurveyAnswerIdFieldObject),
		question: t.relation('question', SurveyAnswerQuestionFieldObject),
		option: t.relation('option', SurveyAnswerOptionFieldObject),
		user: t.relation('user', SurveyAnswerUserFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManySurveyAnswerQueryObject(t);
	return {
		findManySurveyAnswers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').SurveyAnswer]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueSurveyAnswerQueryObject(t);
	return {
		findUniqueSurveyAnswer: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').SurveyAnswer]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneSurveyAnswerMutationObject(t);
	return {
		updateOneSurveyAnswer: t.prismaField({
			...field,
			args: {
				where: t.arg({
					type: t.builder.inputType('UpdateOneSurveyAnswerWhereUniqueInput', {
						fields: (t) => ({
							id: t.field({
								type: 'String',
								required: false
							}),
							userId: t.field({
								type: 'String',
								required: false
							}),
							questionId: t.field({
								type: 'String',
								required: false
							})
						})
					}),
					required: true
				}),
				data: t.arg({
					type: t.builder.inputType('UpdateOneSurveyAnswerInput', {
						fields: (t) => ({
							optionId: t.field({
								type: 'String',
								required: true
							})
						})
					})
				})
			},
			resolve: async (query, root, args, ctx, info) => {
				if (!args.where.id && (!args.where.userId || !args.where.questionId)) {
					throw new Error('You must provide either an id or a userId and questionId');
				}

				if (!args.data.optionId) {
					throw new Error('You must provide an optionId');
				}

				const where = {
					id: args.where.id || undefined,
					questionId_userId:
						(args.where.userId &&
							args.where.questionId && {
								userId: args.where.userId!,
								questionId: args.where.questionId!
							}) ||
						undefined,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').SurveyAnswer]
				};

				console.log(where);

				const data = {
					optionId: args.data.optionId!
				};

				return await upsertWithRetry(
					async () =>
						await db.surveyAnswer.upsert({
							where,
							create: {
								userId: args.where.userId!,
								questionId: args.where.questionId!,
								...data
							},
							update: data
						}),
					async () =>
						await db.surveyAnswer.update({
							where,
							data
						})
				);
			}
		})
	};
});
