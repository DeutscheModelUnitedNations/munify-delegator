import { db } from '$db/db';
import { findUniqueConferenceQueryArgs } from '$db/generated/graphql/Conference/queries/findUnique.base';
import { GraphQLError } from 'graphql';
import {
	ProjectDataSchema,
	type Committee,
	type Nation
} from '../../../routes/assignment-assistant/[projectId]/appData.svelte';
import { builder } from '../builder';
import * as m from '$lib/paraglide/messages';
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

						const childDelegationsDB = await tx.delegation.createManyAndReturn({
							data: childDelegations.map((childDelegation) => ({
								conferenceId: parentDelegationDB.conferenceId,
								entryCode: makeDelegationEntryCode(),
								applied: true,
								school: parentDelegationDB.school,
								motivation: parentDelegationDB.motivation,
								experience: parentDelegationDB.experience,
								supervisors: {
									connect: parentDelegationDB.supervisors.map((x) => ({
										id: x.id
									}))
								},
								members: {
									create: childDelegation.members.map((member, i) => ({
										conferenceId: parentDelegationDB.conferenceId,
										userId: member.user.id,
										isHeadDelegate: childDelegation.members.some((x) => x.isHeadDelegate)
											? member.isHeadDelegate
											: i === 0
									}))
								}
							}))
						});

						childDelegations.forEach((childDelegation, i) => {
							// necessary to find the correct entity of the newly
							// created delegation instead of a non-existing id-reference
							childDelegation.id = childDelegationsDB[i].id;
						});
					}

					// Assignment Single Participants
					for (const participant of data.singleParticipants) {
						if (!participant.assignedRole) continue;
						await tx.assignedConferenceRole.create({
							data: {
								singleParticipantId: participant.id,
								customConferenceRoleId: participant.assignedRole.id
							}
						});
					}

					// Assignment Nations
					for (const nation of getNations(data.conference.committees)) {
						const assignedDelegations = data.delegations.filter(
							(x) => x.assignedNation?.alpha2Code === nation.nation.alpha2Code
						);
						if (!assignedDelegations || assignedDelegations.length < 1) continue;

						const primaryDelegationDB = await tx.delegation.findMany({
							where: {
								id: {
									in: assignedDelegations.map((x) => x.id)
								}
							}
						});
					}
				});

				return {
					success: true
				};
			}
		})
	};
});
