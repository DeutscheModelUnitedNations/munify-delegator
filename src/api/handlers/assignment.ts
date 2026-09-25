import { db, schema } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import {
	ProjectDataSchema,
	type Committee,
	type Nation
} from '../../routes/(authenticated)/assignment-assistant/[projectId]/appData.svelte';

/** Total seats a nation has across every committee it sits in. */
function getNations(committees: Committee[]) {
	const roles: { nation: Nation; seats: number; committees: string[] }[] = [];
	for (const committee of committees) {
		for (const nation of committee.nations) {
			const entry = roles.find((role) => role.nation.alpha2Code === nation.alpha2Code);
			if (entry) {
				entry.seats += committee.numOfSeatsPerDelegation;
				entry.committees = [committee.abbreviation, ...entry.committees];
			} else {
				roles.push({
					nation,
					seats: committee.numOfSeatsPerDelegation,
					committees: [committee.abbreviation]
				});
			}
		}
	}
	return roles;
}

/**
 * Re-links a supervisor to a delegate after the delegate's row has been recreated.
 *
 * Best-effort on purpose: a supervision link that cannot be restored must not abort the whole
 * assignment run, which is how the legacy version behaved.
 */
async function reconnectSupervisor(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	supervisorId: string,
	memberId: string
) {
	try {
		await tx
			.insert(schema.conferenceSupervisorToDelegationMember)
			.values({ a: supervisorId, b: memberId })
			.onConflictDoNothing();
	} catch (error) {
		console.error(`Failed to reconnect supervisor ${supervisorId} to member ${memberId}:`, error);
	}
}

schemaBuilder.mutationFields((t) => ({
	/**
	 * Commits the output of the assignment assistant.
	 *
	 * Three passes, in order, all inside one transaction:
	 *  1. delegations marked as split are deleted and rebuilt as their children;
	 *  2. single participants get their assigned role;
	 *  3. for every nation and every non-state actor, the delegations assigned to it are merged
	 *     into one - the smallest existing delegation becomes the carrier, the rest are removed
	 *     and their members re-created on it.
	 *
	 * Because members are recreated rather than moved, supervision links have to be restored
	 * afterwards, which is what `reconnectSupervisor` does.
	 */
	sendAssignmentData: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			data: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (_root, args, ctx) => {
			const conference = await db.query.conference
				.findFirst(
					ctx.abilities.conference.filter('update').merge({ where: { id: args.conferenceId } })
						.query.single
				)
				.then(assertFindFirstExists);

			if (!args.data) {
				throw new GraphQLError(m.plausibilityIncompleteOrInvalidData());
			}
			const data = ProjectDataSchema.parse(args.data);

			await db.transaction(async (tx) => {
				// 1. Split delegations into their children.
				for (const parent of data.delegations.filter((x) => !!x.splittedInto)) {
					const children = data.delegations.filter((x) => parent.splittedInto?.includes(x.id));

					const parentDB = await tx.query.delegation.findFirst({
						where: { id: parent.id },
						with: { members: true }
					});
					if (!parentDB) {
						throw new GraphQLError(`Parent delegation ${parent.id} not found`);
					}

					const childUserIds = children.flatMap((child) => child.members.map((mem) => mem.user.id));
					const existingUsers = childUserIds.length
						? await tx.query.user.findMany({
								where: { id: { in: childUserIds } },
								columns: { id: true }
							})
						: [];
					const existingUserIds = new Set(existingUsers.map((user) => user.id));
					const missing = childUserIds.filter((id) => !existingUserIds.has(id));
					if (missing.length > 0) {
						throw new GraphQLError(
							`Cannot split delegation ${parent.id}: The following user IDs do not exist: ${missing.join(', ')}`
						);
					}

					await tx.delete(schema.delegation).where(eq(schema.delegation.id, parent.id));

					for (const [index, child] of children.entries()) {
						const childDB = await tx
							.insert(schema.delegation)
							.values({
								conferenceId: conference.id,
								entryCode: makeEntryCode(),
								applied: true,
								school: parentDB.school,
								motivation: parentDB.motivation,
								experience: parentDB.experience
							})
							.returning()
							.then(assertFirstEntryExists);

						const anyHeadDelegate = child.members.some((mem) => mem.isHeadDelegate);
						for (const [memberIndex, member] of child.members.entries()) {
							const created = await tx
								.insert(schema.delegationMember)
								.values({
									conferenceId: conference.id,
									delegationId: childDB.id,
									userId: member.user.id,
									// Keep the marked head delegate, or promote the first member if none was.
									isHeadDelegate: anyHeadDelegate ? member.isHeadDelegate : memberIndex === 0
								})
								.returning()
								.then(assertFirstEntryExists);

							for (const supervisor of member.supervisors ?? []) {
								await reconnectSupervisor(tx, supervisor.id, created.id);
							}
						}

						// The in-memory project data is rewritten so later passes see the new ids.
						children[index].id = childDB.id;
					}
				}

				// 2. Single participant roles.
				for (const participant of data.singleParticipants) {
					if (!participant.assignedRole) continue;
					await tx
						.update(schema.singleParticipant)
						.set({ assignedRoleId: participant.assignedRole.id })
						.where(eq(schema.singleParticipant.id, participant.id));
				}

				// 3. Merge the delegations assigned to each nation, then each non-state actor.
				const mergeInto = async (
					assigned: (typeof data.delegations)[number][],
					assign: { nationAlpha3Code?: string; nonStateActorId?: string }
				) => {
					if (assigned.length < 1) return;

					const delegationsDB = (
						await tx.query.delegation.findMany({
							where: { id: { in: assigned.map((x) => x.id) } },
							with: { members: true }
						})
					).sort((a, b) => a.members.length - b.members.length);

					// The smallest delegation carries the assignment; it keeps its members untouched.
					const primary = delegationsDB.at(0);
					const newUserIds = assigned
						.flatMap((x) => x.members.map((y) => y.user.id))
						.filter((id) => !primary?.members.some((member) => member.userId === id));

					if (primary && newUserIds.length > 0) {
						// Remove the delegations those users are coming from.
						await tx.delete(schema.delegation).where(
							and(
								eq(schema.delegation.conferenceId, conference.id),
								inArray(
									schema.delegation.id,
									(
										await tx.query.delegationMember.findMany({
											where: { userId: { in: newUserIds }, conferenceId: conference.id },
											columns: { delegationId: true }
										})
									).map((row) => row.delegationId)
								)
							)
						);
					}

					const carrierId =
						primary?.id ??
						(
							await tx
								.insert(schema.delegation)
								.values({
									applied: true,
									conferenceId: conference.id,
									entryCode: makeEntryCode(),
									assignedNationAlpha3Code: assign.nationAlpha3Code,
									assignedNonStateActorId: assign.nonStateActorId,
									experience: 'Created during assignment',
									motivation: 'Created during assignment',
									school: 'Created during assignment'
								})
								.returning()
								.then(assertFirstEntryExists)
						).id;

					if (primary) {
						await tx
							.update(schema.delegation)
							.set({
								assignedNationAlpha3Code: assign.nationAlpha3Code,
								assignedNonStateActorId: assign.nonStateActorId
							})
							.where(eq(schema.delegation.id, carrierId));
					}

					for (const [index, userId] of newUserIds.entries()) {
						await tx.insert(schema.delegationMember).values({
							conferenceId: conference.id,
							delegationId: carrierId,
							userId,
							// A brand new delegation needs a head delegate; an existing one already has one.
							isHeadDelegate: !primary && index === 0
						});
					}

					const carrier = await tx.query.delegation.findFirst({
						where: { id: carrierId },
						with: { members: { with: { supervisors: true } } }
					});
					for (const member of carrier?.members ?? []) {
						for (const supervisor of member.supervisors ?? []) {
							await reconnectSupervisor(tx, supervisor.id, member.id);
						}
					}
				};

				for (const nation of getNations(data.conference.committees)) {
					await mergeInto(
						data.delegations.filter(
							(x) => x.assignedNation?.alpha2Code === nation.nation.alpha2Code
						),
						{ nationAlpha3Code: nation.nation.alpha3Code }
					);
				}

				for (const nsa of data.conference.nonStateActors) {
					await mergeInto(
						data.delegations.filter((x) => x.assignedNSA?.id === nsa.id),
						{ nonStateActorId: nsa.id }
					);
				}
			});

			return true;
		}
	})
}));
