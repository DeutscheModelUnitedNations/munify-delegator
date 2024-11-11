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
import { fetchUserParticipations } from '$api/services/fetchUserParticipations';
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
				entryCode: t.arg.string()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				const delegation = await db.delegation.findUniqueOrThrow({
					where: {
						entryCode: args.entryCode
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
							}),
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
