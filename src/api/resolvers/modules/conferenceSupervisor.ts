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
	ConferenceSupervisorUserFieldObject,
	ConferenceSupervisorConnectionCodeFieldObject
} from '$db/generated/graphql/ConferenceSupervisor';
import { db } from '$db/db';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/fetchUserParticipations';
import { GraphQLError } from 'graphql';
import { makeEntryCode } from '$api/services/entryCodeGenerator';

builder.prismaObject('ConferenceSupervisor', {
	fields: (t) => ({
		id: t.field(ConferenceSupervisorIdFieldObject),
		plansOwnAttendenceAtConference: t.field(
			ConferenceSupervisorPlansOwnAttendenceAtConferenceFieldObject
		),
		connectionCode: t.field(ConferenceSupervisorConnectionCodeFieldObject),
		conference: t.relation('conference', ConferenceSupervisorConferenceFieldObject),
		user: t.relation('user', ConferenceSupervisorUserFieldObject),
		supervisedDelegationMembers: t.relation('supervisedDelegationMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		}),
		supervisedSingleParticipants: t.relation('supervisedSingleParticipants', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SingleParticipant
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
		createOneConferenceSupervisor: t.prismaField({
			...field,
			args: {
				userId: t.arg.id({ required: false }),
				conferenceId: t.arg.id(),
				plansOwnAttendenceAtConference: t.arg.boolean()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				const userId = args.userId ?? user.sub;

				const dbUser = await db.teamMember.findUnique({
					where: {
						conferenceId_userId: {
							conferenceId: args.conferenceId,
							userId: user.sub
						},
						role: { in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'] }
					}
				});

				if (args.userId && !dbUser && !user.hasRole('admin')) {
					throw new GraphQLError(
						'Only team members with the roles PARTICIPANT_CARE or PROJECT_MANAGEMENT, or admins can assign supervisors.'
					);
				}

				if (
					await isUserAlreadyRegistered({
						userId,
						conferenceId: args.conferenceId
					})
				) {
					throw new GraphQLError(
						"User is already assigned a different role in the conference. Can't assign supervisor."
					);
				}

				return await db.conferenceSupervisor.create({
					data: {
						plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? true,
						conferenceId: args.conferenceId,
						userId,
						connectionCode: makeEntryCode()
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

builder.queryFields((t) => {
	return {
		previewConferenceSupervisor: t.field({
			type: builder
				.objectRef<{
					given_name: string;
					family_name: string;
				}>('PreviewConferenceSupervisor')
				.implement({
					fields: (t) => ({
						given_name: t.exposeString('given_name'),
						family_name: t.exposeString('family_name')
					})
				}),
			args: {
				conferenceId: t.arg.id({ required: true }),
				connectionCode: t.arg.string({ required: true })
			},
			resolve: async (parent, args, ctx) => {
				// CAREFUL: This is not authenticated
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const r = await fetchUserParticipations({
					conferenceId: args.conferenceId,
					userId: user.sub,
					throwIfAnyIsFound: false
				});

				if (
					!r.foundDelegationMember &&
					!r.foundSingleParticipant &&
					!r.foundTeamMember &&
					!r.foundSupervisor
				) {
					throw new GraphQLError('You are not registered for this conference.');
				}

				return db.conferenceSupervisor
					.findUniqueOrThrow({
						where: {
							conferenceId_connectionCode: {
								conferenceId: args.conferenceId,
								connectionCode: args.connectionCode
							}
						},
						include: {
							user: true
						}
					})
					.then((r) => ({
						given_name: r.user.given_name,
						family_name: r.user.family_name
					}));
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneConferenceSupervisorMutationObject(t);
	return {
		connectToConferenceSupervisor: t.prismaField({
			...field,
			args: {
				conferenceId: t.arg.id({ required: true }),
				userId: t.arg.id({ required: false }),
				connectionCode: t.arg.string({ required: true })
			},
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				const specifiedUserId = args.userId ?? user.sub;

				const supervisor = await db.conferenceSupervisor.findUniqueOrThrow({
					where: {
						conferenceId_connectionCode: {
							conferenceId: args.conferenceId,
							connectionCode: args.connectionCode
						}
					}
				});

				const r = await fetchUserParticipations({
					conferenceId: args.conferenceId,
					userId: specifiedUserId,
					throwIfAnyIsFound: false
				});

				if (r.foundSupervisor || r.foundTeamMember) {
					throw new GraphQLError(
						'You are already a supervisor or team member of this conference and cannot connect to a supervisor.'
					);
				}

				if (!r.foundDelegationMember && !r.foundSingleParticipant) {
					throw new GraphQLError(
						'You are not a participant of this conference and cannot connect to a supervisor inside it.'
					);
				}

				return await db.conferenceSupervisor.update({
					where: { id: supervisor.id },
					data: {
						supervisedDelegationMembers: r.foundDelegationMember
							? {
									connect: {
										id: r.foundDelegationMember.id
									}
								}
							: undefined,

						supervisedSingleParticipants: r.foundSingleParticipant
							? {
									connect: {
										id: r.foundSingleParticipant.id
									}
								}
							: undefined
					},
					...query
				});
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
						supervisedDelegationMembers: {
							none: {}
						},
						supervisedSingleParticipants: {
							none: {}
						},
						conferenceId: args.conferenceId,
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

builder.mutationFields((t) => {
	return {
		rotateSupervisorConnectionCode: t.prismaField({
			type: 'ConferenceSupervisor',
			args: {
				id: t.arg.id({ required: true })
			},
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const supervisor = await db.conferenceSupervisor.findUniqueOrThrow({
					where: {
						id: args.id
					}
				});

				if (supervisor.userId !== user.sub || !user.hasRole('admin')) {
					throw new GraphQLError('You are not allowed to rotate this connection code.');
				}

				return await db.conferenceSupervisor.update({
					where: { id: supervisor.id },
					data: {
						connectionCode: makeEntryCode()
					},
					...query
				});
			}
		})
	};
});
