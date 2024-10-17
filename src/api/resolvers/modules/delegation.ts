import { builder } from '../builder';
import {
	deleteOneDelegationMutationObject,
	findManyDelegationQueryObject,
	findUniqueDelegationQueryObject,
	DelegationAppliedFieldObject,
	DelegationExperienceFieldObject,
	DelegationIdFieldObject,
	DelegationMotivationFieldObject,
	DelegationSchoolFieldObject,
	updateOneDelegationMutationObject,
	DelegationEntryCodeFieldObject,
	createOneDelegationMutationObject
} from '$db/generated/graphql/Delegation';
import { fetchUserParticipations } from '$api/services/fetchUserParticipations';
import { db } from '$db/db';
import { makeDelegationEntryCode } from '$api/services/delegationEntryCodeGenerator';
import { tidyRoleApplications } from '$api/services/removeTooSmallRoleApplications';

builder.prismaObject('Delegation', {
	fields: (t) => ({
		id: t.field(DelegationIdFieldObject),
		applied: t.field(DelegationAppliedFieldObject),
		school: t.field(DelegationSchoolFieldObject),
		motivation: t.field(DelegationMotivationFieldObject),
		experience: t.field(DelegationExperienceFieldObject),
		entryCode: t.field(DelegationEntryCodeFieldObject),
		conference: t.relation('conference'),
		members: t.relation('members', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		}),
		supervisors: t.relation('supervisors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor
			})
		}),
		appliedForRoles: t.relation('appliedForRoles', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').RoleApplication
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyDelegationQueryObject(t);
	return {
		findManyDelegations: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Delegation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueDelegationQueryObject(t);
	return {
		findUniqueDelegation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Delegation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneDelegationMutationObject(t);
	return {
		createOneDelegation: t.prismaField({
			...field,
			args: {
				conferenceId: t.arg.string(),
				motivation: t.arg.string(),
				school: t.arg.string(),
				experience: t.arg.string()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				// if the user somehow is already participating in the conference, throw an error
				await fetchUserParticipations({
					conferenceId: args.conferenceId,
					userId: user.sub!,
					throwIfAnyIsFound: true
				});

				return db.$transaction(async (tx) => {
					const delegation = await tx.delegation.create({
						...query,
						data: {
							conference: {
								connect: {
									id: args.conferenceId
								}
							},
							motivation: args.motivation,
							school: args.school,
							experience: args.experience,
							entryCode: makeDelegationEntryCode()
						}
					});

					await tx.delegationMember.create({
						data: {
							conference: {
								connect: {
									id: delegation.conferenceId
								}
							},
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
							isHeadDelegate: true
						}
					});

					return delegation;
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneDelegationMutationObject(t);
	return {
		updateOneDelegation: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				resetEntryCode: t.arg.boolean({ required: false }),
				newHeadDelegateUserId: t.arg.string({ required: false }),
				applied: t.arg.boolean({ required: false })
			},
			resolve: async (query, root, args, ctx) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Delegation]
				};

				const delegation = await db.delegation.findUniqueOrThrow({
					...query,
					where: args.where,
					include: {
						...query.include,
						members: true
					}
				});

				if (args.applied !== undefined && args.applied !== null) {
					await tidyRoleApplications({ id: delegation.id });

					if (delegation.members.length < 2) {
						throw new Error('Not enough members');
					}

					if (delegation.appliedForRoles.length < 3) {
						throw new Error('Not enough role applications');
					}

					if (!delegation.school || !delegation.experience || !delegation.motivation) {
						throw new Error('Missing information');
					}

					await db.delegation.update({
						where: {
							id: delegation.id,
							AND: [ctx.permissions.allowDatabaseAccessTo('update').Delegation]
						},
						data: {
							applied: args.applied
						}
					});
				}

				if (args.resetEntryCode) {
					await db.delegation.update({
						where: {
							id: delegation.id,
							AND: [ctx.permissions.allowDatabaseAccessTo('update').Delegation]
						},
						data: {
							entryCode: makeDelegationEntryCode()
						}
					});
				}

				if (args.newHeadDelegateUserId) {
					const currentHeadDelegate = delegation.members.find((m) => m.isHeadDelegate);
					if (!currentHeadDelegate) throw new Error('No head delegate member found');
					const newHeadDelegate = delegation.members.find(
						(m) => m.userId === args.newHeadDelegateUserId
					);
					if (!newHeadDelegate) throw new Error('No new head delegate member found');

					await db.$transaction(async (tx) => {
						await tx.delegationMember.update({
							where: {
								id: currentHeadDelegate.id,
								AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
							},
							data: {
								isHeadDelegate: false
							}
						});

						await tx.delegationMember.update({
							where: {
								id: newHeadDelegate.id,
								AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
							},
							data: {
								isHeadDelegate: true
							}
						});
					});
				}

				return delegation;
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneDelegationMutationObject(t);
	return {
		deleteOneDelegation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Delegation]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	return {
		previewDelegation: t.field({
			type: t.builder.simpleObject('DelegationPreview', {
				fields: (t) => ({
					id: t.string(),
					conferenceId: t.string(),
					entryCode: t.string(),
					motivation: t.string({ nullable: true }),
					school: t.string({ nullable: true }),
					experience: t.string({ nullable: true }),
					memberCount: t.int(),
					headDelegateFullName: t.string(),
					applied: t.boolean(),
					conferenceTitle: t.string()
				})
			}),
			args: {
				conferenceId: t.arg.string(),
				entryCode: t.arg.string()
			},
			resolve: async (root, args, ctx) => {
				ctx.permissions.getLoggedInUserOrThrow();
				const delegation = await db.delegation.findUniqueOrThrow({
					where: {
						conferenceId: args.conferenceId,
						entryCode: args.entryCode
						// we dont want permission checks here. We carefully choose what to send, see the select statements below
						// AND: [permissions.allowDatabaseAccessTo('read').Delegation]
					},
					include: {
						conference: {
							select: {
								title: true
							}
						},
						_count: {
							select: { members: true }
						},
						members: {
							where: {
								isHeadDelegate: true
							},
							include: {
								user: {
									select: {
										//TODO check if this is ok with our privacy policy
										given_name: true,
										family_name: true
									}
								}
							}
						}
					}
				});

				return {
					id: delegation.id,
					conferenceId: delegation.conferenceId,
					entryCode: delegation.entryCode,
					motivation: delegation.motivation,
					school: delegation.school,
					experience: delegation.experience,
					memberCount: delegation._count.members,
					headDelegateFullName: `${delegation.members.find((x) => x.isHeadDelegate)?.user.given_name} ${delegation.members.find((x) => x.isHeadDelegate)?.user.family_name}`,
					applied: delegation.applied,
					conferenceTitle: delegation.conference.title
				};
			}
		})
	};
});