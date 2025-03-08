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
	updateOneConferenceParticipantStatusMutationObject,
	ConferenceParticipantStatusAdditionalNotesFieldObject
} from '$db/generated/graphql/ConferenceParticipantStatus';
import { db } from '$db/db';
import { AdministrativeStatus } from '$db/generated/graphql/inputs';

builder.prismaObject('ConferenceParticipantStatus', {
	fields: (t) => ({
		id: t.field(ConferenceParticipantStatusIdFieldObject),
		termsAndConditions: t.field(ConferenceParticipantStatusTermsAndConditionsFieldObject),
		guardianConsent: t.field(ConferenceParticipantStatusGuardianConsentFieldObject),
		mediaConsent: t.field(ConferenceParticipantStatusMediaConsentFieldObject),
		additionalNotes: t.field(ConferenceParticipantStatusAdditionalNotesFieldObject),
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

// const administrativeStatusEnum = builder.enumType('AdministrativeStatus', {
// 	values: ['PENDING', 'PROBLEM', 'DONE'] as const
// });

builder.mutationFields((t) => {
	const field = updateOneConferenceParticipantStatusMutationObject(t);
	return {
		updateOneConferenceParticipantStatus: t.prismaField({
			...field,
			args: {
				where: t.arg({
					type: t.builder.inputType('ConferenceParticipantStatusWhereUniqueInputNotRequired', {
						fields: (t) => ({
							id: t.field({
								type: 'ID',
								required: false
							}),
							userId: t.field({
								type: 'ID',
								required: true
							}),
							conferenceId: t.field({
								type: 'ID',
								required: true
							})
						})
					})
				}),
				data: t.arg({
					type: t.builder.inputType('UpdateConferenceParticipantStatusInput', {
						fields: (t) => ({
							termsAndConditions: t.field({
								type: AdministrativeStatus,
								required: false
							}),
							guardianConsent: t.field({
								type: AdministrativeStatus,
								required: false
							}),
							mediaConsent: t.field({
								type: AdministrativeStatus,
								required: false
							}),
							paymentStatus: t.field({
								type: AdministrativeStatus,
								required: false
							}),
							didAttend: t.field({
								type: 'Boolean',
								required: false
							}),
							additionalNotes: t.field({
								type: 'String',
								required: false
							})
						})
					})
				})
			},
			resolve: (query, root, args, ctx, info) => {
				if (!args.where.id && (!args.where.userId || !args.where.conferenceId)) {
					throw new Error('You must provide either an id or a userId and conferenceId');
				}

				return db.conferenceParticipantStatus.upsert({
					where: {
						id: args.where.id || undefined,
						userId_conferenceId:
							(args.where.userId &&
								args.where.conferenceId && {
									userId: args.where.userId!,
									conferenceId: args.where.conferenceId!
								}) ||
							undefined,
						AND: [ctx.permissions.allowDatabaseAccessTo('update').ConferenceParticipantStatus]
					},

					create: {
						userId: args.where.userId!,
						conferenceId: args.where.conferenceId!,
						termsAndConditions: args.data.termsAndConditions || undefined,
						guardianConsent: args.data.guardianConsent || undefined,
						mediaConsent: args.data.mediaConsent || undefined,
						paymentStatus: args.data.paymentStatus || undefined,
						didAttend: args.data.didAttend === null ? undefined : args.data.didAttend,
						additionalNotes: args.data.additionalNotes ?? ''
					},
					update: {
						termsAndConditions: args.data.termsAndConditions || undefined,
						guardianConsent: args.data.guardianConsent || undefined,
						mediaConsent: args.data.mediaConsent || undefined,
						paymentStatus: args.data.paymentStatus || undefined,
						didAttend: args.data.didAttend === null ? undefined : args.data.didAttend,
						additionalNotes: args.data.additionalNotes ?? ''
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
