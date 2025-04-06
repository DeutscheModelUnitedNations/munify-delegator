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
	ConferenceParticipantStatusMediaConsentStatusFieldObject,
	updateManyConferenceParticipantStatusMutationObject
} from '$db/generated/graphql/ConferenceParticipantStatus';
import { db } from '$db/db';
import { AdministrativeStatus, MediaConsentStatus } from '$db/generated/graphql/inputs';

builder.prismaObject('ConferenceParticipantStatus', {
	fields: (t) => ({
		id: t.field(ConferenceParticipantStatusIdFieldObject),
		termsAndConditions: t.field(ConferenceParticipantStatusTermsAndConditionsFieldObject),
		guardianConsent: t.field(ConferenceParticipantStatusGuardianConsentFieldObject),
		mediaConsent: t.field(ConferenceParticipantStatusMediaConsentFieldObject),
		paymentStatus: t.field(ConferenceParticipantStatusPaymentStatusFieldObject),
		mediaConsentStatus: t.field(ConferenceParticipantStatusMediaConsentStatusFieldObject),
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
							mediaConsentStatus: t.field({
								type: MediaConsentStatus,
								required: false
							}),
							paymentStatus: t.field({
								type: AdministrativeStatus,
								required: false
							}),
							didAttend: t.field({
								type: 'Boolean',
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
						mediaConsentStatus: args.data.mediaConsentStatus || undefined,
						paymentStatus: args.data.paymentStatus || undefined,
						didAttend: args.data.didAttend === null ? undefined : args.data.didAttend
					},
					update: {
						termsAndConditions: args.data.termsAndConditions || undefined,
						guardianConsent: args.data.guardianConsent || undefined,
						mediaConsent: args.data.mediaConsent || undefined,
						mediaConsentStatus: args.data.mediaConsentStatus || undefined,
						paymentStatus: args.data.paymentStatus || undefined,
						didAttend: args.data.didAttend === null ? undefined : args.data.didAttend
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

builder.mutationFields((t) => {
	const field = updateManyConferenceParticipantStatusMutationObject(t);
	return {
		updateAllConferenceParticipantStatus: t.field({
			...field,
			args: {
				conferenceId: t.arg({
					type: 'String',
					required: true
				}),
				data: t.arg({
					type: t.builder.inputType('UpdateAllConferenceParticipantStatusInput', {
						fields: (t) => ({
							didAttend: t.field({
								type: 'Boolean',
								required: false
							})
						})
					})
				})
			},
			type: t.builder.simpleObject('UpdateAllConferenceParticipantStatusResponse', {
				fields: (t) => ({
					changed: t.field({
						type: ['String'],
						nullable: true
					})
				})
			}),
			resolve: async (root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				// Check permissions
				if (!user.hasRole('admin')) {
					throw new Error('You do not have permission to update all conference participant status');
				}

				const changed = await db.$transaction(async (tx) => {
					const conferenceUsers = await tx.user.findMany({
						where: {
							OR: [
								{
									conferenceSupervisor: {
										some: {
											conferenceId: args.conferenceId
										}
									}
								},
								{
									singleParticipant: {
										some: {
											conferenceId: args.conferenceId
										}
									}
								},
								{
									delegationMemberships: {
										some: {
											conferenceId: args.conferenceId
										}
									}
								}
							]
						},
						include: {
							conferenceParticipantStatus: true
						}
					});

					const changed: string[] = [];

					for (const user of conferenceUsers) {
						const res = await tx.conferenceParticipantStatus.upsert({
							where: {
								userId_conferenceId: {
									userId: user.id,
									conferenceId: args.conferenceId
								}
							},
							create: {
								userId: user.id,
								conferenceId: args.conferenceId,
								didAttend: args.data.didAttend !== null ? args.data.didAttend : undefined
							},
							update: {
								didAttend: args.data.didAttend !== null ? args.data.didAttend : undefined
							}
						});
						changed.push(res.id);
					}
					return changed;
				});
				return {
					changed
				};
			}
		})
	};
});
