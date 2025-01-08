import { builder } from '../builder';
import {
	deleteOneConferenceParticipantStatusMutationObject,
	findManyConferenceParticipantStatusQueryObject,
	findUniqueConferenceParticipantStatusQueryObject,
	ConferenceParticipantStatusIdFieldObject,
	ConferenceParticipantStatusPaymentStatusFieldObject,
	ConferenceParticipantStatusDidAttendFieldObject,
	ConferenceParticipantStatusUserFieldObject,
	ConferenceParticipantStatusConferenceFieldObject,
	ConferenceParticipantStatusTermsAndConditionsFieldObject,
	ConferenceParticipantStatusGuardianConsentFieldObject,
	ConferenceParticipantStatusMediaConsentFieldObject,
	updateOneConferenceParticipantStatusMutationObject
} from '$db/generated/graphql/ConferenceParticipantStatus';
import { db } from '$db/db';
import type { AdministrativeStatus } from '@prisma/client';

builder.prismaObject('ConferenceParticipantStatus', {
	fields: (t) => ({
		id: t.field(ConferenceParticipantStatusIdFieldObject),
		termsAndConditions: t.field(ConferenceParticipantStatusTermsAndConditionsFieldObject),
		guardianConsent: t.field(ConferenceParticipantStatusGuardianConsentFieldObject),
		mediaConsent: t.field(ConferenceParticipantStatusMediaConsentFieldObject),
		paymentStatus: t.field(ConferenceParticipantStatusPaymentStatusFieldObject),
		didAttend: t.field(ConferenceParticipantStatusDidAttendFieldObject),
		user: t.relation('user', ConferenceParticipantStatusUserFieldObject),
		conference: t.relation('conference', ConferenceParticipantStatusConferenceFieldObject)
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
			args: {
				userId: t.arg.id(),
				conferenceId: t.arg.id(),
				termsAndConditions: t.arg.string(),
				guardianConsent: t.arg.string(),
				mediaConsent: t.arg.string(),
				paymentStatus: t.arg.string(),
				didAttend: t.arg.boolean()
			},
			resolve: (query, root, args, ctx, info) => {
				const administrativeStatus = ['PENDING', 'PROBLEM', 'DONE'];

				if (!administrativeStatus.includes(args.paymentStatus)) {
					throw new Error('Invalid payment status');
				}

				if (!administrativeStatus.includes(args.termsAndConditions)) {
					throw new Error('Invalid terms and conditions status');
				}

				if (!administrativeStatus.includes(args.guardianConsent)) {
					throw new Error('Invalid guardian consent status');
				}

				if (!administrativeStatus.includes(args.mediaConsent)) {
					throw new Error('Invalid media consent status');
				}

				return db.conferenceParticipantStatus.upsert({
					where: {
						userId_conferenceId: { userId: args.userId, conferenceId: args.conferenceId },
						AND: [ctx.permissions.allowDatabaseAccessTo('update').ConferenceParticipantStatus]
					},

					create: {
						userId: args.userId,
						conferenceId: args.conferenceId,
						termsAndConditions: args.termsAndConditions as AdministrativeStatus,
						guardianConsent: args.guardianConsent as AdministrativeStatus,
						mediaConsent: args.mediaConsent as AdministrativeStatus,
						paymentStatus: args.paymentStatus as AdministrativeStatus,
						didAttend: args.didAttend
					},
					update: {
						termsAndConditions: args.termsAndConditions as AdministrativeStatus,
						guardianConsent: args.guardianConsent as AdministrativeStatus,
						mediaConsent: args.mediaConsent as AdministrativeStatus,
						paymentStatus: args.paymentStatus as AdministrativeStatus,
						didAttend: args.didAttend
					}
				});
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
