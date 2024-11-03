import { builder } from '../builder';
import {
	createOneSingleParticipantMutationObject,
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
import { fetchUserParticipations } from '$api/services/fetchUserParticipations';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import * as m from '$lib/paraglide/messages';

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

builder.mutationFields((t) => {
	const field = createOneSingleParticipantMutationObject(t);
	return {
		createOneSingleParticipant: t.prismaField({
			...field,
			args: {
				conferenceId: t.arg.id(),
				motivation: t.arg.string(),
				experience: t.arg.string(),
				school: t.arg.string()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const { foundDelegationMember, foundSupervisor, foundTeamMember } =
					await fetchUserParticipations({
						conferenceId: args.conferenceId,
						userId: user.sub
					});

				if (foundDelegationMember || foundSupervisor || foundTeamMember) {
					throw new GraphQLError(
						m.youCantApplyAsSingleParticipantAsYouAreAlreadyAppliedInTheConference()
					);
				}

				return await db.singleParticipant.create({
					...query,
					data: {
						conferenceId: args.conferenceId,
						motivation: args.motivation,
						experience: args.experience,
						school: args.school,
						userId: user.sub!
					}
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneSingleParticipantMutationObject(t);
	return {
		updateOneSingleParticipant: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				applyForRolesIdList: t.arg.idList({required: false}),
				unApplyForRolesIdList: t.arg.idList({required: false}),
				applied: t.arg.boolean({ required: false })
			},
			resolve: async (query, root, args, ctx) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').SingleParticipant]
				};

				if (args.applied) {
					const singleParticipant = await db.singleParticipant.findUniqueOrThrow({
						where: args.where,
						include: {
							appliedForRoles: {
								where: {
									AND: [ctx.permissions.allowDatabaseAccessTo('read').CustomConferenceRole]
								}
							}
						}
					});

					if (singleParticipant.appliedForRoles.length < 1) {
						throw new GraphQLError(m.notEnoughtRoleApplications());
					}

					if (
						!singleParticipant.school ||
						!singleParticipant.experience ||
						!singleParticipant.motivation
					) {
						throw new GraphQLError(m.missingInformation());
					}
				}

				return await db.singleParticipant.update({
					...query,
					where: args.where,
					data: {
						appliedForRoles: {
							connect: args.applyForRolesIdList
								? args.applyForRolesIdList.map((id) => ({ id }))
								: [],
							disconnect: args.unApplyForRolesIdList
								? args.unApplyForRolesIdList.map((id) => ({ id }))
								: []
						},
						applied: args.applied !== undefined && args.applied !== null ? args.applied : undefined
					}
				});
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
