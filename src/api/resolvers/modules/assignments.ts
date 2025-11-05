import { db } from '$db/db';
import { findUniqueConferenceQueryArgs } from '$db/generated/graphql/Conference/queries/findUnique.base';
import { GraphQLError } from 'graphql';
import {
	ProjectDataSchema,
	type Committee,
	type Nation
} from '../../../routes/(authenticated)/assignment-assistant/[projectId]/appData.svelte';
import { builder } from '../builder';
import { m } from '$lib/paraglide/messages';
import { makeEntryCode } from '$api/services/entryCodeGenerator';

function getNations(committees: Committee[]): {
	nation: Nation;
	seats: number;
	committees: string[];
}[] {
	const role: { nation: Nation; seats: number; committees: string[] }[] = [];
	committees.forEach((committee) => {
		committee.nations.forEach((nation) => {
			const entry = role.find((role) => role.nation.alpha2Code === nation.alpha2Code);
			if (entry) {
				entry.seats += committee.numOfSeatsPerDelegation;
				entry.committees = [committee.abbreviation, ...entry.committees];
			} else {
				role.push({
					nation,
					seats: committee.numOfSeatsPerDelegation,
					committees: [committee.abbreviation]
				});
			}
		});
	});
	return role;
}

async function reconnectSupervisors(tx: typeof db, supervisorId: string, memberId: string) {
	try {
		await tx.conferenceSupervisor.update({
			where: {
				id: supervisorId
			},
			data: {
				supervisedDelegationMembers: {
					connect: {
						id: memberId
					}
				}
			}
		});
	} catch (error) {
		console.error(`Failed to reconnect supervisor ${supervisorId} to member ${memberId}:`, error);
	}
}

builder.mutationFields((t) => {
	return {
		sendAssignmentData: t.field({
			type: t.builder.simpleObject('SetAssignmentDataResult', {
				fields: (t) => ({
					success: t.boolean()
				})
			}),
			args: {
				...findUniqueConferenceQueryArgs,
				data: t.arg({ type: 'JSONObject' })
			},
			resolve: async (root, args, ctx) => {
				// Just check if the conference exists beforehand
				const conference = await db.conference.findUniqueOrThrow({
					where: {
						...args.where,
						AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
					}
				});

				if (!args.data) {
					throw new GraphQLError(m.plausibilityIncompleteOrInvalidData());
				}

				const data = ProjectDataSchema.parse(args.data);

				await db.$transaction(async (tx) => {
					// Split Delegations and delete parents
					for (const parentDelegation of data.delegations.filter((x) => !!x.splittedInto)) {
						const childDelegations = data.delegations.filter((x) =>
							parentDelegation.splittedInto?.includes(x.id)
						);

						// Fetch parent delegation with members BEFORE deleting
						const parentDelegationDB = await tx.delegation.findUnique({
							where: { id: parentDelegation.id },
							include: { members: true }
						});

						if (!parentDelegationDB) {
							throw new GraphQLError(`Parent delegation ${parentDelegation.id} not found`);
						}

						// Verify all user IDs in child delegations actually exist
						const allChildUserIds = childDelegations.flatMap((cd) =>
							cd.members.map((m) => m.user.id)
						);
						const existingUsers = await tx.user.findMany({
							where: { id: { in: allChildUserIds } },
							select: { id: true }
						});
						const existingUserIds = new Set(existingUsers.map((u) => u.id));
						const missingUserIds = allChildUserIds.filter((id) => !existingUserIds.has(id));

						if (missingUserIds.length > 0) {
							throw new GraphQLError(
								`Cannot split delegation ${parentDelegation.id}: The following user IDs do not exist: ${missingUserIds.join(', ')}`
							);
						}

						// Now delete the parent delegation
						await tx.delegation.delete({
							where: { id: parentDelegation.id }
						});

						const childDelegationsDB: Awaited<ReturnType<typeof tx.delegation.create>>[] = [];

						for (const childDelegation of childDelegations) {
							try {
								const childDelegationDB = await tx.delegation.create({
									data: {
										conferenceId: conference.id,
										entryCode: makeEntryCode(),
										applied: true,
										school: parentDelegationDB.school,
										motivation: parentDelegationDB.motivation,
										experience: parentDelegationDB.experience,
										members:
											childDelegation.members.length > 0
												? {
														create: childDelegation.members.map((member, i) => ({
															conferenceId: conference.id,
															userId: member.user.id,
															isHeadDelegate: childDelegation.members.some((x) => x.isHeadDelegate)
																? member.isHeadDelegate
																: i === 0
														}))
													}
												: undefined
									},
									include: {
										members: {
											include: {
												supervisors: true
											}
										}
									}
								});

								const userIdToNewMemberIdMap = new Map<string, string>();

								childDelegationDB.members.forEach((member) => {
									userIdToNewMemberIdMap.set(member.userId, member.id);
								});

								for (const member of childDelegation.members) {
									const newMemberId = userIdToNewMemberIdMap.get(member.user.id);
									if (!newMemberId) {
										throw new GraphQLError(
											`Member ID not found for user ${member.user.id} in child delegation`
										);
									}
									for (const supervisor of member.supervisors ?? []) {
										await reconnectSupervisors(tx as typeof db, supervisor.id, newMemberId);
									}
								}

								childDelegationsDB.push(childDelegationDB);
							} catch (error) {
								// Provide richer diagnostics to pinpoint the actual cause (e.g., missing user connect)
								const e = error as any;
								const details = {
									code: e?.code,
									meta: e?.meta,
									message: e?.message,
									stack: e?.stack
								};
								throw new GraphQLError(
									`Failed to create child delegation for parent delegation ${parentDelegation.id}. Details: ${JSON.stringify(
										details
									)}. Members: ${JSON.stringify(childDelegation.members)}`
								);
							}
						}

						childDelegations.forEach((childDelegation, i) => {
							// necessary to find the correct entity of the newly
							// created delegation instead of a non-existing id-reference
							childDelegation.id = childDelegationsDB[i].id;
						});
					}

					// Assignment Single Participants
					for (const participant of data.singleParticipants) {
						if (!participant.assignedRole) continue;
						await tx.singleParticipant.update({
							where: {
								id: participant.id
							},
							data: {
								assignedRoleId: participant.assignedRole.id
							}
						});
					}

					// Assignment Nations
					for (const nation of getNations(data.conference.committees)) {
						const assignedDelegations = data.delegations.filter(
							(x) => x.assignedNation?.alpha2Code === nation.nation.alpha2Code
						);
						if (!assignedDelegations || assignedDelegations.length < 1) continue;

						// search for all existing Delegations
						const delegationsDB = (
							await tx.delegation.findMany({
								where: {
									id: {
										in: assignedDelegations.map((x) => x.id)
									}
								},
								include: {
									members: true
								}
							})
						)?.sort((a, b) => a.members.length - b.members.length);

						// pick the first (largest) delegation as primary delegation
						const primaryDelegation = delegationsDB.at(0);

						// gather all other user-ids to fill the primary delegation
						const newUserIds = assignedDelegations
							.flatMap((x) => x.members.map((y) => y.user.id))
							.filter((x) => !primaryDelegation?.members.some((y) => y.userId === x));

						// delete all other delegations
						if (primaryDelegation) {
							await tx.delegation.deleteMany({
								where: {
									AND: [
										{
											members: {
												some: {
													userId: {
														in: newUserIds
													}
												}
											}
										},
										{
											conferenceId: {
												equals: data.conference.id
											}
										}
									]
								}
							});
						}

						// delete all other single participants (they were converted to delegations with just one member)
						await tx.singleParticipant.deleteMany({
							where: {
								id: {
									// The frontend delivers single participants, that have been converted to delegations
									// with the same id. Therefore, we can search for the delegation id instead of the single participant id.
									in: assignedDelegations.map((x) => x.id)
								}
							}
						});

						// assign the nation to the primary delegation and update the members and supervisors
						const newOrExistingDelegation = await tx.delegation.upsert({
							where: {
								id: primaryDelegation?.id ?? ''
							},
							update: {
								assignedNation: {
									connect: {
										alpha2Code: nation.nation.alpha2Code
									}
								},
								members: {
									create: newUserIds.map((x, i) => ({
										conferenceId: data.conference.id,
										userId: x,
										isHeadDelegate: false
									}))
								}
							},
							create: {
								applied: true,
								conferenceId: data.conference.id,
								entryCode: makeEntryCode(),
								assignedNationAlpha3Code: nation.nation.alpha3Code,
								experience: 'Created during assignment',
								motivation: 'Created during assignment',
								school: 'Created during assignment',
								members:
									newUserIds.length > 0
										? {
												create: newUserIds.map((x, i) => ({
													conferenceId: data.conference.id,
													userId: x,
													isHeadDelegate: i === 0
												}))
											}
										: undefined
							},
							include: {
								members: {
									include: {
										supervisors: true
									}
								}
							}
						});

						for (const member of newOrExistingDelegation.members) {
							for (const supervisor of member.supervisors ?? []) {
								await reconnectSupervisors(tx as typeof db, supervisor.id, member.id);
							}
						}
					}

					for (const nsa of data.conference.nonStateActors) {
						const assignedDelegations = data.delegations.filter(
							(x) => x.assignedNSA?.id === nsa.id
						);
						if (!assignedDelegations || assignedDelegations.length < 1) continue;

						// search for all existing Delegations
						const delegationsDB = (
							await tx.delegation.findMany({
								where: {
									id: {
										in: assignedDelegations.map((x) => x.id)
									}
								},
								include: {
									members: true
								}
							})
						)?.sort((a, b) => a.members.length - b.members.length);

						// pick the first (largest) delegation as primary delegation
						const primaryDelegation = delegationsDB.at(0);

						// gather all other user-ids to fill the primary delegation
						const newUserIds = assignedDelegations
							.flatMap((x) => x.members.map((y) => y.user.id))
							.filter((x) => !primaryDelegation?.members.some((y) => y.userId === x));

						// delete all other delegations
						if (primaryDelegation && newUserIds.length > 0) {
							await tx.delegation.deleteMany({
								where: {
									AND: [
										{
											members: {
												some: {
													userId: {
														in: newUserIds
													}
												}
											}
										},
										{
											conferenceId: {
												equals: data.conference.id
											}
										}
									]
								}
							});
						}

						// delete all other single participants (they were converted to delegations with just one member)
						await tx.singleParticipant.deleteMany({
							where: {
								id: {
									// The frontend delivers single participants, that have been converted to delegations
									// with the same id. Therefore, we can search for the delegation id instead of the single participant id.
									in: assignedDelegations.map((x) => x.id)
								}
							}
						});

						// assign the nsa to the primary delegation and update the members and supervisors
						const newOrExistingDelegation = await tx.delegation.upsert({
							where: {
								id: primaryDelegation?.id
							},
							update: {
								assignedNonStateActor: {
									connect: {
										id: nsa.id
									}
								},
								members:
									newUserIds.length > 0
										? {
												create: newUserIds.map((x, i) => ({
													conferenceId: data.conference.id,
													userId: x,
													isHeadDelegate: false
												}))
											}
										: undefined
							},
							create: {
								applied: true,
								conferenceId: data.conference.id,
								entryCode: makeEntryCode(),
								experience: 'Created during assignment',
								motivation: 'Created during assignment',
								school: 'Created during assignment',
								assignedNonStateActorId: nsa.id,
								members: {
									create: newUserIds.map((x, i) => ({
										conferenceId: data.conference.id,
										userId: x,
										isHeadDelegate: i === 0
									}))
								}
							},
							include: {
								members: {
									include: {
										supervisors: true
									}
								}
							}
						});

						for (const member of newOrExistingDelegation.members) {
							for (const supervisor of member.supervisors ?? []) {
								await reconnectSupervisors(tx as typeof db, supervisor.id, member.id);
							}
						}
					}
				});

				return {
					success: true
				};
			}
		})
	};
});
