import { builder } from '../builder';
import {
	createOneTeamMemberMutationObject,
	deleteOneTeamMemberMutationObject,
	findManyTeamMemberQueryObject,
	findUniqueTeamMemberQueryObject,
	TeamMemberConferenceFieldObject,
	TeamMemberIdFieldObject,
	TeamMemberRoleFieldObject,
	updateOneTeamMemberMutationObject,
	TeamMemberUserFieldObject
} from '$db/generated/graphql/TeamMember';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';

builder.prismaObject('TeamMember', {
	fields: (t) => ({
		id: t.field(TeamMemberIdFieldObject),
		role: t.field(TeamMemberRoleFieldObject),
		conference: t.relation('conference', TeamMemberConferenceFieldObject),
		user: t.relation('user', TeamMemberUserFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyTeamMemberQueryObject(t);
	return {
		findManyTeamMembers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').TeamMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueTeamMemberQueryObject(t);
	return {
		findUniqueTeamMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').TeamMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneTeamMemberMutationObject(t);
	return {
		createOneTeamMember: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				// Verify the acting user has PROJECT_MANAGEMENT role or is admin
				const conferenceId = args.data.conferenceId;
				const hasPermission = await db.teamMember.findFirst({
					where: {
						conferenceId: conferenceId,
						userId: user.sub,
						role: 'PROJECT_MANAGEMENT'
					}
				});

				if (!hasPermission && !user.hasRole('admin')) {
					throw new GraphQLError('Only PROJECT_MANAGEMENT can add team members');
				}

				// Check if user already exists as team member
				const existing = await db.teamMember.findUnique({
					where: {
						conferenceId_userId: {
							conferenceId: conferenceId,
							userId: args.data.userId
						}
					}
				});

				if (existing) {
					throw new GraphQLError('User is already a team member');
				}

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneTeamMemberMutationObject(t);
	return {
		updateOneTeamMember: t.prismaField({
			...field,
			args: { where: field.args.where, data: field.args.data },
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').TeamMember]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneTeamMemberMutationObject(t);
	return {
		deleteOneTeamMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').TeamMember]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
