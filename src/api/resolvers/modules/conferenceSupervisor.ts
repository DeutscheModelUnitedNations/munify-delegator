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
import { m } from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
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
				userId: t.arg.id(),
				conferenceId: t.arg.id(),
				plansOwnAttendenceAtConference: t.arg.boolean()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const dbUser = await db.teamMember.findUnique({
					where: {
						conferenceId_userId: {
							conferenceId: args.conferenceId,
							userId: user.sub
						},
						role: { in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'] }
					}
				});

				if (!dbUser && !user.hasRole('admin')) {
					throw new GraphQLError(
						'Only team members with the roles PARTICIPANT_CARE or PROJECT_MANAGEMENT, or admins can assign supervisors.'
					);
				}

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
						userId: args.userId,
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
