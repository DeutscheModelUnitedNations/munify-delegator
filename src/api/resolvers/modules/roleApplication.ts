import { builder } from '../builder';
import {
	createOneRoleApplicationMutationObject,
	deleteOneRoleApplicationMutationObject,
	findManyRoleApplicationQueryObject,
	findUniqueRoleApplicationQueryObject,
	RoleApplicationIdFieldObject,
	RoleApplicationRankFieldObject,
	updateOneRoleApplicationMutationObject
} from '$db/generated/graphql/RoleApplication';
import { findUniqueDelegationQueryArgs } from '$db/generated/graphql/Delegation/queries/findUnique.base';
import { db } from '$db/db';

builder.prismaObject('RoleApplication', {
	fields: (t) => ({
		id: t.field(RoleApplicationIdFieldObject),
		rank: t.field(RoleApplicationRankFieldObject),
		delegation: t.relation('delegation'),
		nation: t.relation('nation'),
		nonStateActor: t.relation('nonStateActor')
	})
});

builder.queryFields((t) => {
	const field = findManyRoleApplicationQueryObject(t);
	return {
		findManyRoleApplications: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').RoleApplication]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueRoleApplicationQueryObject(t);
	return {
		findUniqueRoleApplication: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').RoleApplication]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneRoleApplicationMutationObject(t);
	return {
		createOneRoleApplication: t.prismaField({
			...field,
			args: {
				delegationId: t.arg.string(),
				nonStateActorId: t.arg.string({ required: false }),
				nationId: t.arg.string({ required: false })
			},
			resolve: async (query, root, args, ctx) => {
				if (!args.nationId && !args.nonStateActorId) {
					throw new Error('Either nationId or nonStateActorId must be provided');
				}

				if (args.nationId && args.nonStateActorId) {
					throw new Error('Only one of nationId or nonStateActorId can be provided');
				}

				// this is for permission checks only
				await db.delegation.findUniqueOrThrow({
					where: {
						id: args.delegationId,
						AND: [ctx.permissions.allowDatabaseAccessTo('update').Delegation]
					}
				});

				const amountOfApplications = (
					await db.roleApplication.aggregate({
						where: {
							delegationId: args.delegationId
						},
						_count: true
					})
				)._count;

				return await db.roleApplication.create({
					...query,
					data: {
						rank: amountOfApplications + 1,
						nation: args.nationId
							? {
									connect: {
										alpha3Code: args.nationId
									}
								}
							: undefined,
						nonStateActor: args.nonStateActorId
							? {
									connect: {
										id: args.nonStateActorId
									}
								}
							: undefined,
						delegation: {
							connect: {
								id: args.delegationId
							}
						}
					}
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	return {
		swapRoleApplicationRanks: t.field({
			type: t.builder.simpleObject('RoleApplicationRankSwapResult', {
				fields: (t) => ({
					ok: t.boolean()
				})
			}),
			args: {
				firstRoleApplicationId: t.arg.string({ required: true }),
				secondRoleApplicationId: t.arg.string({ required: true })
			},
			resolve: async (root, args, ctx) => {
				await db.$transaction(async (tx) => {
					const [firstRoleApplication, secondRoleApplication] = await Promise.all([
						tx.roleApplication.findUniqueOrThrow({
							where: {
								id: args.firstRoleApplicationId,
								AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
							}
						}),
						tx.roleApplication.findUniqueOrThrow({
							where: {
								id: args.secondRoleApplicationId,
								AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
							}
						})
					]);

					await tx.roleApplication.update({
						where: {
							id: args.firstRoleApplicationId,
							AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
						},
						data: {
							rank: -1
						}
					});

					await tx.roleApplication.update({
						where: {
							id: args.secondRoleApplicationId,
							AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
						},
						data: {
							rank: firstRoleApplication.rank
						}
					});

					await tx.roleApplication.update({
						where: {
							id: args.firstRoleApplicationId,
							AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
						},
						data: {
							rank: secondRoleApplication.rank
						}
					});
				});

				return {
					ok: true
				};
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneRoleApplicationMutationObject(t);
	return {
		updateOneRoleApplication: t.prismaField({
			...field,
			args: { where: field.args.where },
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneRoleApplicationMutationObject(t);
	return {
		deleteOneRoleApplication: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx) => {
				return await db.$transaction(async (db) => {
					const deletedApplication = await db.roleApplication.delete({
						...query,
						where: {
							...args.where,
							AND: [ctx.permissions.allowDatabaseAccessTo('delete').RoleApplication]
						}
					});

					const roleApplicationsOfDelegation = await db.roleApplication.findMany({
						where: {
							delegationId: deletedApplication.delegationId
						}
					});

					for (const ra of roleApplicationsOfDelegation) {
						if (ra.rank > deletedApplication.rank) {
							await db.roleApplication.update({
								where: {
									id: ra.id
								},
								data: {
									rank: ra.rank - 1
								}
							});
						}
					}

					return deletedApplication;
				});
			}
		})
	};
});
