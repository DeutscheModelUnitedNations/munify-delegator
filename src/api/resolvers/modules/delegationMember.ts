import { builder } from '../builder';
import {
	deleteOneDelegationMemberMutationObject,
	findManyDelegationMemberQueryObject,
	findUniqueDelegationMemberQueryObject,
	DelegationMemberIdFieldObject,
	DelegationMemberIsHeadDelegateFieldObject,
	createOneDelegationMemberMutationObject
} from '$db/generated/graphql/DelegationMember';
import { db } from '$db/db';
import * as m from '$lib/paraglide/messages';
import { fetchUserParticipations } from '$api/services/fetchUserParticipations';
import { tidyRoleApplications } from '$api/services/removeTooSmallRoleApplications';
import { GraphQLError } from 'graphql';

builder.prismaObject('DelegationMember', {
	fields: (t) => ({
		id: t.field(DelegationMemberIdFieldObject),
		isHeadDelegate: t.field(DelegationMemberIsHeadDelegateFieldObject),
		conference: t.relation('conference'),
		delegation: t.relation('delegation'),
		user: t.relation('user')
	})
});

builder.queryFields((t) => {
	const field = findManyDelegationMemberQueryObject(t);
	return {
		findManyDelegationMembers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').DelegationMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueDelegationMemberQueryObject(t);
	return {
		findUniqueDelegationMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').DelegationMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneDelegationMemberMutationObject(t);
	return {
		createOneDelegationMember: t.prismaField({
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

				if (delegation.applied) {
					throw new GraphQLError(m.delegationHasAlreadyApplied());
				}

				// if the user somehow is already participating in the conference, throw an error
				await fetchUserParticipations({
					conferenceId: delegation.conferenceId,
					userId: user.sub,
					throwIfAnyIsFound: true
				});

				const ret = await db.delegationMember.create({
					...query,
					data: {
						delegation: {
							connect: {
								id: delegation.id
							}
						},
						user: {
							connect: {
								id: user.sub
							}
						},
						isHeadDelegate: false,
						conference: {
							connect: {
								id: delegation.conferenceId
							}
						}
					}
				});

				await tidyRoleApplications({id: delegation.id});

				return ret;
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = updateOneDelegationMemberMutationObject(t);
// 	return {
// 		updateOneDelegationMember: t.prismaField({
// 			...field,
// 			args: { where: field.args.where },
// 			resolve: (query, root, args, ctx, info) => {
// 				args.where = {
// 					...args.where,
// 					AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
// 				};
// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = deleteOneDelegationMemberMutationObject(t);
	return {
		deleteOneDelegationMember: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').DelegationMember]
				};

				return await db.$transaction(async (tx) => {
					const deletedMember = await tx.delegationMember.delete({
						...query,
						where: args.where
					});

					if (deletedMember.isHeadDelegate) {
						const newHeadDelegate = await tx.delegationMember.findFirst({
							where: {
								delegationId: deletedMember.delegationId
							}
						});

						if (!newHeadDelegate) {
							// if there is no one left in the delegation, close it
							await tx.delegation.delete({
								where: {
									id: deletedMember.delegationId
								}
							});
							return;
						}

						// if there is a new head delegate, congratulations to your promotion!
						await tx.delegationMember.update({
							where: {
								id: newHeadDelegate.id
							},
							data: {
								isHeadDelegate: true
							}
						});
					}

					await tidyRoleApplications({ id: deletedMember.delegationId });
					return deletedMember;
				});
			}
		})
	};
});
