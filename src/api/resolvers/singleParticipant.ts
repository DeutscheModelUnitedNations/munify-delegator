import { builder } from './builder';
import {
	deleteOneSingleParticipantMutationObject,
	findManySingleParticipantQueryObject,
	findUniqueSingleParticipantQueryObject,
	SingleParticipantAppliedFieldObject,
	SingleParticipantExperienceFieldObject,
	SingleParticipantIdFieldObject,
	SingleParticipantMotivationFieldObject,
	SingleParticipantSchoolFieldObject,
	updateOneSingleParticipantMutationObject
} from '$db/generated/graphql/SingleParticipant';

builder.prismaObject('SingleParticipant', {
	fields: (t) => ({
		id: t.field(SingleParticipantIdFieldObject),
		applied: t.field(SingleParticipantAppliedFieldObject),
		school: t.field(SingleParticipantSchoolFieldObject),
		motivation: t.field(SingleParticipantMotivationFieldObject),
		experience: t.field(SingleParticipantExperienceFieldObject),
		conference: t.relation('conference'),
		user: t.relation('user'),
		appliedForRoles: t.relation('appliedForRoles', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CustomConferenceRole
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManySingleParticipantQueryObject(t);
	return {
		findManySingleParticipants: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').SingleParticipant]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueSingleParticipantQueryObject(t);
	return {
		findUniqueSingleParticipant: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').SingleParticipant]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneSingleParticipantMutationObject(t);
// 	return {
// 		createOneSingleParticipant: t.prismaField({
// 			...field,
// 			args: { ...field.args, token: t.arg.string({ required: true }) },
// 			resolve: async (query, root, args, ctx, info) => {
// 				//TODO check permissions

// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = updateOneSingleParticipantMutationObject(t);
	return {
		updateOneSingleParticipant: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').SingleParticipant]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneSingleParticipantMutationObject(t);
	return {
		deleteOneSingleParticipant: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').SingleParticipant]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
