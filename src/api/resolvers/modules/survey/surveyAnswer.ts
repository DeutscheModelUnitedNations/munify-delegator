import { db } from '$db/db';
import {
	findManySurveyAnswerQueryObject,
	findUniqueSurveyAnswerQueryObject,
	SurveyAnswerIdFieldObject,
	SurveyAnswerOptionFieldObject,
	SurveyAnswerQuestionFieldObject,
	SurveyAnswerUserFieldObject,
	SurveyAnswerCreatedAtFieldObject,
	updateOneSurveyAnswerMutationObject
} from '$db/generated/graphql/SurveyAnswer';
import { builder } from '../../builder';
import { upsertWithRetry } from '$api/services/prismaUpsertWithRetry';
import { m } from '$lib/paraglide/messages';
import { GraphQLError } from 'graphql';

builder.prismaObject('SurveyAnswer', {
	fields: (t) => ({
		id: t.field(SurveyAnswerIdFieldObject),
		question: t.relation('question', SurveyAnswerQuestionFieldObject),
		option: t.relation('option', SurveyAnswerOptionFieldObject),
		user: t.relation('user', SurveyAnswerUserFieldObject),
		createdAt: t.field(SurveyAnswerCreatedAtFieldObject)
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
				const user = ctx.permissions.getLoggedInUserOrThrow();

				if (!args.where.id && (!args.where.userId || !args.where.questionId)) {
					throw new GraphQLError('You must provide either an id or a userId and questionId');
				}

				if (!args.data.optionId) {
					throw new GraphQLError('You must provide an optionId');
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

				const data = {
					optionId: args.data.optionId!
				};

				const option = await db.surveyOption.findUniqueOrThrow({
					where: {
						id: data.optionId
					},
					include: {
						surveyAnswers: true,
						question: true
					}
				});

				const question = await db.surveyQuestion.findUniqueOrThrow({
					where: {
						id: option.questionId
					}
				});

				// if the user is admin, project management or participant care, skip the following checks
				const conferenceAdminUser = await db.user.findUnique({
					where: {
						id: user.sub,
						teamMember: {
							some: {
								conferenceId: question.conferenceId,
								role: {
									in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE']
								}
							}
						}
					}
				});

				if (!conferenceAdminUser && !user.hasRole('admin')) {
					if (option.surveyAnswers.length >= option.upperLimit && !!option.upperLimit) {
						throw new Error(m.optionUpperLimitReached(option.upperLimit));
					}

					if (new Date(option.question.deadline) < new Date()) {
						throw new Error(m.questionDeadlinePassed());
					}
				}

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
