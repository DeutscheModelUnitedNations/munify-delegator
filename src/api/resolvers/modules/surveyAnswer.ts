import {
	findManySurveyAnswerQueryObject,
	findUniqueSurveyAnswerQueryObject,
	SurveyAnswerIdFieldObject,
	SurveyAnswerOptionFieldObject,
	SurveyAnswerQuestionFieldObject,
	SurveyAnswerUserFieldObject
} from '$db/generated/graphql/SurveyAnswer';
import { builder } from '../builder';

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
