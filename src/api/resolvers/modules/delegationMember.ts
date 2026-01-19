import { builder } from '../builder';
import {
	deleteOneDelegationMemberMutationObject,
	findManyDelegationMemberQueryObject,
	findUniqueDelegationMemberQueryObject,
	DelegationMemberIdFieldObject,
	DelegationMemberIsHeadDelegateFieldObject,
	createOneDelegationMemberMutationObject,
	DelegationMemberConferenceFieldObject,
	DelegationMemberDelegationFieldObject,
	DelegationMemberUserFieldObject,
	DelegationMemberAssignedCommitteeFieldObject,
	updateOneDelegationMemberMutationObject,
	updateManyDelegationMemberMutationObject
} from '$db/generated/graphql/DelegationMember';
import { db } from '$db/db';
import { m } from '$lib/paraglide/messages';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/fetchUserParticipations';
import { tidyRoleApplications } from '$api/services/removeTooSmallRoleApplications';
import { GraphQLError } from 'graphql';
import { makeEntryCode } from '$api/services/entryCodeGenerator';

builder.prismaObject('DelegationMember', {
	fields: (t) => ({
		id: t.field(DelegationMemberIdFieldObject),
		isHeadDelegate: t.field(DelegationMemberIsHeadDelegateFieldObject),
		conference: t.relation('conference', DelegationMemberConferenceFieldObject),
		delegation: t.relation('delegation', DelegationMemberDelegationFieldObject),
		user: t.relation('user', DelegationMemberUserFieldObject),
		assignedCommittee: t.relation(
			'assignedCommittee',
			DelegationMemberAssignedCommitteeFieldObject
		),
		supervisors: t.relation('supervisors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor
			})
		})
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
				entryCode: t.arg.string(),
				conferenceId: t.arg.id()
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				const delegation = await db.delegation.findUniqueOrThrow({
					where: {
						conferenceId_entryCode: {
							conferenceId: args.conferenceId,
							entryCode: args.entryCode
						}
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

				await tidyRoleApplications({ id: delegation.id });

				return ret;
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneDelegationMemberMutationObject(t);
	return {
		createOneAppliedDelegationMember: t.prismaField({
			...field,
			args: {
				userId: t.arg.id(),
				conferenceId: t.arg.id(),
				assignedNonStateActorId: t.arg.id({ required: false }),
				assignedNationAlpha3Code: t.arg.string({ required: false }),
				assignedCommitteeId: t.arg.id({ required: false })
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
						'Only team members with the roles PARTICIPANT_CARE or PROJECT_MANAGEMENT, or admins can assign delegation members.'
					);
				}

				const {
					userId,
					conferenceId,
					assignedNonStateActorId,
					assignedNationAlpha3Code,
					assignedCommitteeId
				} = args;

				let delegation = await db.delegation.findFirst({
					where: {
						conferenceId,
						OR: [
							{
								assignedNationAlpha3Code
							},
							{
								assignedNonStateActorId
							}
						]
					},
					include: {
						members: true
					}
				});

				return db.$transaction(async (tx) => {
					const delegationInfos = {
						applied: true,
						experience: 'No Info',
						school: 'No Info',
						motivation: 'Assigned by management'
					};

					if (
						await isUserAlreadyRegistered({
							userId,
							conferenceId
						})
					) {
						try {
							await tx.delegationMember.delete({
								where: {
									conferenceId_userId: {
										conferenceId: args.conferenceId,
										userId: userId
									}
								}
							});
						} catch (e) {
							try {
								await tx.singleParticipant.delete({
									where: {
										conferenceId_userId: {
											conferenceId: args.conferenceId,
											userId: userId
										}
									}
								});
							} catch (e) {
								throw new GraphQLError(
									'User is already part of the conference and records could not be deleted'
								);
							}
						}
					}

					if (!delegation) {
						delegation = await tx.delegation.create({
							data: {
								conferenceId,
								assignedNationAlpha3Code,
								assignedNonStateActorId,
								entryCode: makeEntryCode(),
								...delegationInfos
							},
							include: {
								members: true
							}
						});
					} else if (delegation.members.length === 0) {
						await tx.delegation.update({
							where: {
								id: delegation.id
							},
							data: delegationInfos
						});
					}

					await tx.waitingListEntry
						.update({
							where: {
								conferenceId_userId: {
									conferenceId,
									userId
								}
							},
							data: { assigned: true }
						})
						.catch(() => {});

					return await tx.delegationMember.create({
						...query,
						data: {
							conferenceId: args.conferenceId,
							userId,
							delegationId: delegation.id,
							assignedCommitteeId,
							isHeadDelegate: !delegation.members.some((x) => x.isHeadDelegate)
						}
					});
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneDelegationMemberMutationObject(t);
	return {
		updateOneDelegationMemberCommittee: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('UpdateOneDelegationMemberCommitteeInput', {
						fields: (t) => ({
							assignedCommitteeId: t.field({
								type: 'ID'
							})
						})
					})
				})
			},
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
				};

				return db.$transaction(async (tx) => {
					const member = await tx.delegationMember.findUniqueOrThrow({
						where: args.where,
						include: {
							delegation: {
								include: {
									members: true
								}
							}
						}
					});

					const delegationMembers = member.delegation.members.filter((x) => x.id !== member.id);

					const alreadyAssignedMembers = delegationMembers.filter(
						(x) => x.assignedCommitteeId === args.data.assignedCommitteeId
					);

					const committee = await tx.committee.findUniqueOrThrow({
						where: {
							id: args.data.assignedCommitteeId
						}
					});

					if (alreadyAssignedMembers) {
						if (alreadyAssignedMembers?.length >= committee.numOfSeatsPerDelegation) {
							// unassign the one that hasn't been updated longest
							await tx.delegationMember.update({
								where: {
									id: alreadyAssignedMembers.sort(
										(a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
									)[0].id
								},
								data: {
									assignedCommitteeId: member.assignedCommitteeId ?? null
								}
							});
						}
					}

					return await tx.delegationMember.update({
						...query,
						where: args.where,
						data: args.data
					});
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateManyDelegationMemberMutationObject(t);
	return {
		updateManyDelegationMemberCommittee: t.field({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('UpdateManyDelegationMemberCommitteeInput', {
						fields: (t) => ({
							assignedCommitteeId: t.field({
								type: 'ID',
								required: false
							})
						})
					})
				})
			},
			resolve: async (root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
				};

				return await db.delegationMember.updateMany({
					where: args.where,
					data: {
						assignedCommitteeId: args.data.assignedCommitteeId ?? null
					}
				});
			}
		})
	};
});

// mutation to update many delegation members to assign them to different committees
builder.mutationFields((t) => {
	return {
		assignCommitteesToDelegationMembers: t.prismaField({
			type: ['DelegationMember'],
			args: {
				assignments: t.arg({
					type: [
						t.builder.inputType('updateManyDelegationMemberInputTypeArrayValue', {
							fields: (t) => ({
								delegationMemberId: t.string(),
								committeeId: t.string()
							})
						})
					],
					required: true
				})
			},
			resolve: async (query, root, args, ctx) => {
				return db.$transaction(async (tx) => {
					await Promise.all(
						args.assignments.map(async (data) => {
							const requestedCommittee = await tx.committee.findUniqueOrThrow({
								where: {
									id: data.committeeId
								},
								include: {
									nations: true
								}
							});

							const requestedDelegationMember = await tx.delegationMember.findUniqueOrThrow({
								where: {
									id: data.delegationMemberId
								},
								include: {
									delegation: true
								}
							});

							if (requestedCommittee.conferenceId !== requestedDelegationMember.conferenceId) {
								throw new GraphQLError(m.committeeDoesNotBelongToConferenceError());
							}

							if (
								!requestedCommittee.nations
									.map((n) => n.alpha3Code)
									.includes(requestedDelegationMember.delegation.assignedNationAlpha3Code || '')
							) {
								throw new GraphQLError(m.committeeDoesNotBelongToConferenceError());
							}

							const member = await tx.delegationMember.findUniqueOrThrow({
								where: {
									id: data.delegationMemberId,
									AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
								}
							});

							return await tx.delegationMember.update({
								where: {
									id: member.id
								},
								data: {
									assignedCommitteeId: data.committeeId
								}
							});
						})
					);

					return tx.delegationMember.findMany({
						...query,
						where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
					});
				});
			}
		})
	};
});

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

builder.mutationFields((t) => {
	return {
		// dead = not assigned to any role
		deleteDeadDelegationMembers: t.prismaField({
			type: ['DelegationMember'],
			args: {
				conferenceId: t.arg.id()
			},
			resolve: async (query, root, args, ctx) => {
				return db.$transaction(async (tx) => {
					const where = {
						assignedCommittee: null,
						delegation: {
							assignedNation: null,
							assignedNonStateActor: null
						},
						conferenceId: args.conferenceId,
						AND: [ctx.permissions.allowDatabaseAccessTo('delete').DelegationMember]
					};

					const res = await tx.delegationMember.findMany({
						...query,
						where
					});

					await db.delegationMember.deleteMany({
						where
					});

					return res;
				});
			}
		})
	};
});
