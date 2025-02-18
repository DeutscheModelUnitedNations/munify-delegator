import {
	findManySurveyQuestionQueryObject,
	findUniqueSurveyQuestionQueryObject,
	SurveyQuestionConferenceFieldObject,
	SurveyQuestionDeadlineFieldObject,
	SurveyQuestionDescriptionFieldObject,
	SurveyQuestionIdFieldObject,
	SurveyQuestionTitleFieldObject
} from '$db/generated/graphql/SurveyQuestion';
import { SurveyQuestionForGroupsFieldObject } from '$db/generated/graphql/SurveyQuestion/object.base';
import { builder } from '../builder';

builder.prismaObject('SurveyQuestion', {
	fields: (t) => ({
		id: t.field(SurveyQuestionIdFieldObject),
		title: t.field(SurveyQuestionTitleFieldObject),
		description: t.field(SurveyQuestionDescriptionFieldObject),
		deadline: t.field(SurveyQuestionDeadlineFieldObject),
		forGroups: t.field(SurveyQuestionForGroupsFieldObject),
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
