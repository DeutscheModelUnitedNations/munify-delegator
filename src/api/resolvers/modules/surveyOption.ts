import {
	findManySurveyOptionQueryObject,
	findUniqueSurveyOptionQueryObject,
	SurveyOptionDescriptionFieldObject,
	SurveyOptionIdFieldObject,
	SurveyOptionQuestionFieldObject,
	SurveyOptionTitleFieldObject,
	SurveyOptionUpperLimitFieldObject
} from '$db/generated/graphql/SurveyOption';
import { builder } from '../builder';

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
