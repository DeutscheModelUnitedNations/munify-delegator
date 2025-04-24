import { db } from '$db/db';
import { findUniqueConferenceQueryArgs } from '$db/generated/graphql/Conference/queries/findUnique.base';
import { GraphQLError } from 'graphql';
import {
	ProjectDataSchema,
	type Committee,
	type Nation
} from '../../../routes/assignment-assistant/[projectId]/appData.svelte';
import { builder } from '../builder';
import { m } from '$lib/paraglide/messages';
import { makeDelegationEntryCode } from '$api/services/delegationEntryCodeGenerator';

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
			resolve: (root, args, ctx) => {
				const conference = db.conference.findUniqueOrThrow({
					where: {
						...args.where,
						AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
					}
				});

				if (!args.data) {
					throw new GraphQLError(m.plausibilityIncompleteOrInvalidData());
				}

				const data = ProjectDataSchema.parse(args.data);

				db.$transaction(async (tx) => {
					// Split Delegations and delete parents
					for (const parentDelegation of data.delegations.filter((x) => !!x.splittedInto)) {
						const childDelegations = data.delegations.filter((x) =>
							parentDelegation.splittedInto?.includes(x.id)
						);

						const parentDelegationDB = await tx.delegation.delete({
							where: {
								id: parentDelegation.id
							},
							include: {
								supervisors: true
							}
						});

						const childDelegationsDB: Awaited<ReturnType<typeof tx.delegation.create>>[] = [];

						for (const childDelegation of childDelegations) {
							const childDelegationDB = await tx.delegation.create({
								data: {
									conferenceId: parentDelegationDB.conferenceId,
									entryCode: makeDelegationEntryCode(),
									applied: true,
									school: parentDelegationDB.school,
									motivation: parentDelegationDB.motivation,
									experience: parentDelegationDB.experience,
									supervisors:
										parentDelegationDB.supervisors.length > 0
											? {
													connect: parentDelegationDB.supervisors.map((supervisor) => ({
														conferenceId_userId: {
															conferenceId: parentDelegationDB.conferenceId,
															userId: supervisor.userId
														}
													}))
												}
											: undefined,
									members:
										childDelegation.members.length > 0
											? {
													create: childDelegation.members.map((member, i) => ({
														conferenceId: parentDelegationDB.conferenceId,
														userId: member.user.id,
														isHeadDelegate: childDelegation.members.some((x) => x.isHeadDelegate)
															? member.isHeadDelegate
															: i === 0
													}))
												}
											: undefined
								}
							});

							childDelegationsDB.push(childDelegationDB);
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
									members: true,
									supervisors: true
								}
							})
						)?.sort((a, b) => a.members.length - b.members.length);

						// pick the first (largest) delegation as primary delegation
						const primaryDelegation = delegationsDB.at(0);

						// gather all other user-ids to fill the primary delegation
						const newUserIds = assignedDelegations
							.flatMap((x) => x.members.map((y) => y.user.id))
							.filter((x) => !primaryDelegation?.members.some((y) => y.userId === x));

						// gather all supervisors to fill the primary delegation
						const newSupervisorIds = assignedDelegations
							.flatMap((x) => x.supervisors.map((y) => y.user.id))
							.filter((x) => !primaryDelegation?.supervisors.some((y) => y.userId === x));

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
						await tx.delegation.upsert({
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
								},
								supervisors:
									newSupervisorIds.length > 0
										? {
												connect: newSupervisorIds.map((x) => ({
													conferenceId_userId: {
														conferenceId: data.conference.id,
														userId: x
													}
												}))
											}
										: undefined
							},
							create: {
								applied: true,
								conferenceId: data.conference.id,
								entryCode: makeDelegationEntryCode(),
								assignedNationAlpha3Code: nation.nation.alpha3Code,
								experience: assignedDelegations[0].experience,
								motivation: assignedDelegations[0].motivation,
								school: assignedDelegations[0].school,
								members:
									newUserIds.length > 0
										? {
												create: newUserIds.map((x, i) => ({
													conferenceId: data.conference.id,
													userId: x,
													isHeadDelegate: i === 0
												}))
											}
										: undefined,
								supervisors: {
									connect: newSupervisorIds.map((x) => ({
										conferenceId_userId: {
											conferenceId: data.conference.id,
											userId: x
										}
									}))
								}
							}
						});
					}

					for (const nsa of data.conference.nonStateActors) {
						const assignedDelegations = data.delegations.filter(
							(x) => x.assignedNSA?.id === nsa.id
						);
						if (!assignedDelegations || assignedDelegations.length < 1) continue;

						// search for all existing Delegations
						const delegationsDB = (
							await db.delegation.findMany({
								where: {
									id: {
										in: assignedDelegations.map((x) => x.id)
									}
								},
								include: {
									members: true,
									supervisors: true
								}
							})
						)?.sort((a, b) => a.members.length - b.members.length);

						// pick the first (largest) delegation as primary delegation
						const primaryDelegation = delegationsDB.at(0);

						// gather all other user-ids to fill the primary delegation
						const newUserIds = assignedDelegations
							.flatMap((x) => x.members.map((y) => y.user.id))
							.filter((x) => !primaryDelegation?.members.some((y) => y.userId === x));

						// gather all supervisors to fill the primary delegation
						const newSupervisorIds = assignedDelegations
							.flatMap((x) => x.supervisors.map((y) => y.user.id))
							.filter((x) => !primaryDelegation?.supervisors.some((y) => y.userId === x));

						// delete all other delegations
						if (primaryDelegation && newUserIds.length > 0) {
							await db.delegation.deleteMany({
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
						await db.singleParticipant.deleteMany({
							where: {
								id: {
									// The frontend delivers single participants, that have been converted to delegations
									// with the same id. Therefore, we can search for the delegation id instead of the single participant id.
									in: assignedDelegations.map((x) => x.id)
								}
							}
						});

						// assign the nsa to the primary delegation and update the members and supervisors
						if (primaryDelegation?.id) {
							await db.delegation.update({
								where: {
									id: primaryDelegation?.id
								},
								data: {
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
											: undefined,
									supervisors:
										newSupervisorIds.length > 0
											? {
													connect: newSupervisorIds.map((x) => ({
														conferenceId_userId: {
															conferenceId: data.conference.id,
															userId: x
														}
													}))
												}
											: undefined
								}
							});
						} else {
							await db.delegation.create({
								data: {
									applied: true,
									conferenceId: data.conference.id,
									entryCode: makeDelegationEntryCode(),
									experience: assignedDelegations[0].experience,
									motivation: assignedDelegations[0].motivation,
									school: assignedDelegations[0].school,
									assignedNonStateActorId: nsa.id,
									members: {
										create: newUserIds.map((x, i) => ({
											conferenceId: data.conference.id,
											userId: x,
											isHeadDelegate: i === 0
										}))
									},
									supervisors: {
										connect: newSupervisorIds.map((x) => ({
											conferenceId_userId: {
												conferenceId: data.conference.id,
												userId: x
											}
										}))
									}
								}
							});
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
