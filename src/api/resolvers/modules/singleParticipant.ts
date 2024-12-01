import { builder } from '../builder';
import {
	createOneSingleParticipantMutationObject,
	deleteOneSingleParticipantMutationObject,
	findManySingleParticipantQueryObject,
	findUniqueSingleParticipantQueryObject,
	SingleParticipantAppliedFieldObject,
	SingleParticipantAssignedRoleFieldObject,
	SingleParticipantAssignmentDetailsFieldObject,
	SingleParticipantConferenceFieldObject,
	SingleParticipantExperienceFieldObject,
	SingleParticipantIdFieldObject,
	SingleParticipantMotivationFieldObject,
	SingleParticipantSchoolFieldObject,
	SingleParticipantUserFieldObject,
	updateOneSingleParticipantMutationObject
} from '$db/generated/graphql/SingleParticipant';
import { fetchUserParticipations } from '$api/services/fetchUserParticipations';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import * as m from '$lib/paraglide/messages';
import { individualApplicationFormSchema } from '../../../routes/(authenticated)/registration/[conferenceId]/individual/[roleId]/form-schema';

builder.prismaObject('SingleParticipant', {
	fields: (t) => ({
		id: t.field(SingleParticipantIdFieldObject),
		applied: t.field(SingleParticipantAppliedFieldObject),
		school: t.field(SingleParticipantSchoolFieldObject),
		assignmentDetails: t.field(SingleParticipantAssignmentDetailsFieldObject),
		motivation: t.field(SingleParticipantMotivationFieldObject),
		experience: t.field(SingleParticipantExperienceFieldObject),
		conference: t.relation('conference', SingleParticipantConferenceFieldObject),
		user: t.relation('user', SingleParticipantUserFieldObject),
		assignedRole: t.relation('assignedRole', SingleParticipantAssignedRoleFieldObject),
		appliedForRoles: t.relation('appliedForRoles', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CustomConferenceRole
			})
		}),
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
				motivation: t.arg.string({ required: false }),
				experience: t.arg.string({ required: false }),
				school: t.arg.string({ required: false }),
				roleId: t.arg.id()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				individualApplicationFormSchema.parse({ ...args, conferenceId: undefined });

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

				// this resolver might also be called if the user already is applied as a single participant
				// we want to make it behave smoothly and therefore allow updating the single participant instead
				const found = await db.singleParticipant.findUnique({
					where: {
						conferenceId_userId: {
							userId: user.sub,
							conferenceId: args.conferenceId
						}
					}
				});
				if (found) {
					return await db.singleParticipant.update({
						...query,
						where: {
							id: found.id,
							AND: [ctx.permissions.allowDatabaseAccessTo('update').SingleParticipant]
						},
						data: {
							motivation: args.motivation ?? undefined,
							experience: args.experience ?? undefined,
							school: args.school ?? undefined,
							appliedForRoles: {
								connect: {
									//TODO we should add a conferenceId restraint on all connects to prevent cross
									// conference relations
									id: args.roleId,
									conferenceId: args.conferenceId
								}
							}
						}
					});
				}

				return await db.singleParticipant.create({
					...query,
					data: {
						conferenceId: args.conferenceId,
						motivation: args.motivation ?? undefined,
						experience: args.experience ?? undefined,
						school: args.school ?? undefined,
						userId: user.sub!,
						appliedForRoles: {
							connect: {
								//TODO we should add a conferenceId restraint on all connects to prevent cross
								// conference relations
								id: args.roleId,
								conferenceId: args.conferenceId
							}
						}
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
				school: t.arg.string({ required: false }),
				experience: t.arg.string({ required: false }),
				motivation: t.arg.string({ required: false }),
				applyForRolesIdList: t.arg.idList({ required: false }),
				unApplyForRolesIdList: t.arg.idList({ required: false }),
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
							},
							conference: true
						}
					});

					if (singleParticipant.appliedForRoles.length < 1) {
						throw new GraphQLError(m.notEnoughtRoleApplications());
					}

					if (
						!singleParticipant.school ||
						singleParticipant.school.length === 0 ||
						!singleParticipant.experience ||
						singleParticipant.experience.length === 0 ||
						!singleParticipant.motivation ||
						singleParticipant.motivation.length === 0 ||
						!individualApplicationFormSchema.safeParse({ ...args, conferenceId: undefined }).success
					) {
						throw new GraphQLError(m.missingInformation());
					}

					if (Date.now() > singleParticipant.conference.startAssignment.getTime()) {
						throw new GraphQLError(m.applicationTimeframeClosed());
					}
				}

				return await db.singleParticipant.update({
					...query,
					where: args.where,
					data: {
						school: args.school ?? undefined,
						experience: args.experience ?? undefined,
						motivation: args.motivation ?? undefined,
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
