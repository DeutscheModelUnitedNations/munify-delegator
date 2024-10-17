import { builder } from '../builder';
import {
	deleteOneConferenceParticipantStatusMutationObject,
	findManyConferenceParticipantStatusQueryObject,
	findUniqueConferenceParticipantStatusQueryObject,
	ConferenceParticipantStatusIdFieldObject,
	updateOneConferenceParticipantStatusMutationObject,
	ConferenceParticipantStatusPostalRegistrationFieldObject,
	ConferenceParticipantStatusPaymentStatusFieldObject,
	ConferenceParticipantStatusDidAttendFieldObject
} from '$db/generated/graphql/ConferenceParticipantStatus';

builder.prismaObject('ConferenceParticipantStatus', {
	fields: (t) => ({
		id: t.field(ConferenceParticipantStatusIdFieldObject),
		postalRegistration: t.field(ConferenceParticipantStatusPostalRegistrationFieldObject),
		paymentStatus: t.field(ConferenceParticipantStatusPaymentStatusFieldObject),
		didAttend: t.field(ConferenceParticipantStatusDidAttendFieldObject),
		user: t.relation('user'),
		conference: t.relation('conference')
	})
});

builder.queryFields((t) => {
	const field = findManyConferenceParticipantStatusQueryObject(t);
	return {
		findManyConferenceParticipantStatuss: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').ConferenceParticipantStatus]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueConferenceParticipantStatusQueryObject(t);
	return {
		findUniqueConferenceParticipantStatus: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').ConferenceParticipantStatus]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneConferenceParticipantStatusMutationObject(t);
// 	return {
// 		createOneConferenceParticipantStatus: t.prismaField({
// 			...field,

// 			resolve: async (query, root, args, ctx, info) => {
// 				//TODO check permissions

// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = updateOneConferenceParticipantStatusMutationObject(t);
	return {
		updateOneConferenceParticipantStatus: t.prismaField({
			...field,
			args: { where: field.args.where },
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').ConferenceParticipantStatus]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneConferenceParticipantStatusMutationObject(t);
	return {
		deleteOneConferenceParticipantStatus: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').ConferenceParticipantStatus]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
