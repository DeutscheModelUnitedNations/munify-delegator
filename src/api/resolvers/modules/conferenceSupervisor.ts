import { builder } from '../builder';
import {
	deleteOneConferenceSupervisorMutationObject,
	findManyConferenceSupervisorQueryObject,
	findUniqueConferenceSupervisorQueryObject,
	ConferenceSupervisorIdFieldObject,
	updateOneConferenceSupervisorMutationObject,
	ConferenceSupervisorPlansOwnAttendenceAtConferenceFieldObject,
	createOneConferenceSupervisorMutationObject,
	ConferenceSupervisorConferenceFieldObject,
	ConferenceSupervisorUserFieldObject
} from '$db/generated/graphql/ConferenceSupervisor';
import { db } from '$db/db';
import * as m from '$lib/paraglide/messages';
import { languageTag } from '$lib/paraglide/runtime';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/fetchUserParticipations';
import { GraphQLError } from 'graphql';

builder.prismaObject('ConferenceSupervisor', {
	fields: (t) => ({
		id: t.field(ConferenceSupervisorIdFieldObject),
		plansOwnAttendenceAtConference: t.field(
			ConferenceSupervisorPlansOwnAttendenceAtConferenceFieldObject
		),
		conference: t.relation('conference', ConferenceSupervisorConferenceFieldObject),
		user: t.relation('user', ConferenceSupervisorUserFieldObject),
		delegations: t.relation('delegations', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Delegation
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyConferenceSupervisorQueryObject(t);
	return {
		findManyConferenceSupervisors: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueConferenceSupervisorQueryObject(t);
	return {
		findUniqueConferenceSupervisor: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').ConferenceSupervisor]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneConferenceSupervisorMutationObject(t);
	return {
		upsertOneConferenceSupervisor: t.prismaField({
			...field,
			args: {
				entryCode: t.arg.string(),
				conferenceId: t.arg.id()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				const delegation = await db.delegation.findUniqueOrThrow({
					where: {
						conferenceId_entryCode: {
							entryCode: args.entryCode,
							conferenceId: args.conferenceId
						}
					}
				});

				const participations = await fetchUserParticipations({
					conferenceId: delegation.conferenceId,
					userId: user.sub!
				});

				// if the user somehow is already participating in the conference as something else than a supervisor, throw
				if (participations.foundDelegationMember) {
					throw new GraphQLError(
						m.youAreAlreadyDelegationMember({}, { languageTag: languageTag() })
					);
				}
				if (participations.foundSingleParticipant) {
					throw new GraphQLError(
						m.youAreAlreadySingleParticipant({}, { languageTag: languageTag() })
					);
				}
				if (participations.foundTeamMember) {
					throw new GraphQLError(m.youAreAlreadyTeamMember({}, { languageTag: languageTag() }));
				}

				return await db.conferenceSupervisor.upsert({
					...query,
					create: {
						plansOwnAttendenceAtConference: false,
						conference: {
							connect: {
								id: delegation.conferenceId
							}
						},
						user: {
							connect: {
								id: user.sub
							}
						},
						delegations: {
							connect: {
								id: delegation.id
							}
						}
					},
					update: {
						delegations: {
							connect: {
								id: delegation.id
							}
						}
					},
					where: {
						conferenceId_userId: {
							conferenceId: delegation.conferenceId,
							userId: user.sub
						}
					}
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneConferenceSupervisorMutationObject(t);
	return {
		createOneConferenceSupervisor: t.prismaField({
			...field,
			args: {
				userId: t.arg.id(),
				conferenceId: t.arg.id(),
				plansOwnAttendenceAtConference: t.arg.boolean()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				if (
					await isUserAlreadyRegistered({
						userId: args.userId,
						conferenceId: args.conferenceId
					})
				) {
					throw new GraphQLError(
						"User is already assigned a different role in the conference. Can't assign supervisor."
					);
				}

				return await db.conferenceSupervisor.create({
					data: {
						plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference,
						conferenceId: args.conferenceId,
						userId: args.userId
					}
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneConferenceSupervisorMutationObject(t);
	return {
		updateOneConferenceSupervisor: t.prismaField({
			...field,
			args: {
				where: field.args.where,

				data: t.arg({
					type: t.builder.inputType('ConferenceSupervisorUpdateDataInput', {
						fields: (t) => ({
							plansOwnAttendenceAtConference: t.boolean({
								required: false
							})
						})
					})
				})
			},
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').ConferenceSupervisor]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneConferenceSupervisorMutationObject(t);
	return {
		deleteOneConferenceSupervisor: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').ConferenceSupervisor]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	return {
		// dead = not assigned to any role
		deleteDeadSupervisors: t.prismaField({
			type: ['ConferenceSupervisor'],
			args: {
				conferenceId: t.arg.id()
			},
			resolve: async (query, root, args, ctx) => {
				return db.$transaction(async (tx) => {
					const where = {
						conferenceId: args.conferenceId,
						OR: [
							{
								delegations: {
									none: {}
								}
							},
							{
								delegations: {
									every: {
										assignedNation: null,
										assignedNonStateActor: null
									}
								}
							}
						],
						AND: [ctx.permissions.allowDatabaseAccessTo('delete').ConferenceSupervisor]
					};

					const res = await tx.conferenceSupervisor.findMany({
						...query,
						where
					});

					await db.conferenceSupervisor.deleteMany({
						where
					});

					return res;
				});
			}
		})
	};
});
