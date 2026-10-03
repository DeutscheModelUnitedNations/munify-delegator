import { type Transaction, db, schema } from '$api/db/db';
import { pubsub as rumblePubsub, schemaBuilder } from '$api/rumble';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import { assertParticipantsOf } from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { nationSeats } from '$lib/helpers/nationSeats';
import { planDelegationMerge, supervisionLinks } from '$api/services/delegationMerge';
import {
	ProjectDataSchema,
	type ProjectData
} from '../../routes/(authenticated)/assignment-assistant/[projectId]/appData.svelte';

/**
 * Re-links a supervisor to a delegate after the delegate's row has been recreated.
 *
 * Best-effort on purpose: a supervision link that cannot be restored must not abort the whole
 * assignment run, which is how the legacy version behaved.
 */
async function reconnectSupervisor(
	tx: Transaction,
	conferenceId: string,
	supervisorId: string,
	memberId: string
) {
	// The supervisor id may come from the uploaded project, so it has to be one of this conference.
	const supervisor = await tx.query.conferenceSupervisor.findFirst({
		where: { id: supervisorId, conferenceId },
		columns: { id: true }
	});
	if (!supervisor) return;
	try {
		await tx
			.insert(schema.conferenceSupervisorToDelegationMember)
			.values({ a: supervisorId, b: memberId })
			.onConflictDoNothing();
	} catch (error) {
		console.error(`Failed to reconnect supervisor ${supervisorId} to member ${memberId}:`, error);
	}
}

type ProjectDelegation = ProjectData['delegations'][number];

/** Throws unless every one of the given users is a member of the delegation being split. */
function assertMembersOf(parent: { id: string; members: { userId: string }[] }, userIds: string[]) {
	const members = new Set(parent.members.map((member) => member.userId));
	const strangers = userIds.filter((id) => !members.has(id));
	if (strangers.length > 0) {
		throw new GraphQLError(
			`Cannot split delegation ${parent.id}: these users are not its members: ${strangers.join(', ')}`
		);
	}
}

/** Re-creates a split-off delegation's members on its new row, keeping their supervisors. */
async function createChildMembers(
	tx: Transaction,
	conferenceId: string,
	delegationId: string,
	child: ProjectDelegation
) {
	const anyHeadDelegate = child.members.some((mem) => mem.isHeadDelegate);
	for (const [memberIndex, member] of child.members.entries()) {
		const created = await tx
			.insert(schema.delegationMember)
			.values({
				conferenceId,
				delegationId,
				userId: member.user.id,
				// Keep the marked head delegate, or promote the first member if none was.
				isHeadDelegate: anyHeadDelegate ? member.isHeadDelegate : memberIndex === 0
			})
			.returning()
			.then(assertFirstEntryExists);

		for (const supervisor of member.supervisors ?? []) {
			await reconnectSupervisor(tx, conferenceId, supervisor.id, created.id);
		}
	}
}

/** Deletes a delegation marked as split and rebuilds it as its children. */
async function splitDelegation(
	tx: Transaction,
	conferenceId: string,
	parentId: string,
	children: ProjectDelegation[]
) {
	const parentDB = await tx.query.delegation.findFirst({
		where: { id: parentId, conferenceId },
		with: { members: true }
	});
	if (!parentDB) {
		throw new GraphQLError(`Parent delegation ${parentId} not found`);
	}

	assertMembersOf(
		parentDB,
		children.flatMap((child) => child.members.map((mem) => mem.user.id))
	);

	await tx
		.delete(schema.delegation)
		.where(
			and(eq(schema.delegation.id, parentId), eq(schema.delegation.conferenceId, conferenceId))
		);

	for (const child of children) {
		const childDB = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				entryCode: makeEntryCode(),
				applied: true,
				school: parentDB.school,
				motivation: parentDB.motivation,
				experience: parentDB.experience
			})
			.returning()
			.then(assertFirstEntryExists);

		await createChildMembers(tx, conferenceId, childDB.id, child);

		// The in-memory project data is rewritten so later passes see the new ids.
		child.id = childDB.id;
	}
}

type RoleAssignment = { nationAlpha3Code?: string; nonStateActorId?: string };

/** Removes the delegations the given users currently belong to. */
async function deleteDelegationsOf(tx: Transaction, conferenceId: string, userIds: string[]) {
	const memberships = await tx.query.delegationMember.findMany({
		where: { userId: { in: userIds }, conferenceId },
		columns: { delegationId: true }
	});
	await tx.delete(schema.delegation).where(
		and(
			eq(schema.delegation.conferenceId, conferenceId),
			inArray(
				schema.delegation.id,
				memberships.map((row) => row.delegationId)
			)
		)
	);
}

/** The delegation that carries a role: the given one re-assigned, or a brand new one. */
async function carrierDelegationId(
	tx: Transaction,
	conferenceId: string,
	primaryId: string | undefined,
	assign: RoleAssignment
) {
	if (primaryId) {
		await tx
			.update(schema.delegation)
			.set({
				assignedNationAlpha3Code: assign.nationAlpha3Code,
				assignedNonStateActorId: assign.nonStateActorId
			})
			.where(
				and(eq(schema.delegation.id, primaryId), eq(schema.delegation.conferenceId, conferenceId))
			);
		return primaryId;
	}

	const created = await tx
		.insert(schema.delegation)
		.values({
			applied: true,
			conferenceId,
			entryCode: makeEntryCode(),
			assignedNationAlpha3Code: assign.nationAlpha3Code,
			assignedNonStateActorId: assign.nonStateActorId,
			experience: 'Created during assignment',
			motivation: 'Created during assignment',
			school: 'Created during assignment'
		})
		.returning()
		.then(assertFirstEntryExists);
	return created.id;
}

/** Restores the supervision links of every member of a delegation. */
async function reconnectSupervisorsOf(tx: Transaction, conferenceId: string, delegationId: string) {
	const carrier = await tx.query.delegation.findFirst({
		where: { id: delegationId },
		with: { members: { with: { supervisors: true } } }
	});
	for (const { supervisorId, memberId } of supervisionLinks(carrier)) {
		await reconnectSupervisor(tx, conferenceId, supervisorId, memberId);
	}
}

/**
 * Merges the delegations assigned to one nation or non-state actor into one: the smallest
 * existing delegation becomes the carrier, the rest are removed and their members re-created on
 * it.
 */
async function mergeAssignedDelegations(
	tx: Transaction,
	conferenceId: string,
	assigned: ProjectDelegation[],
	assign: RoleAssignment
) {
	if (assigned.length < 1) return;

	const existing = await tx.query.delegation.findMany({
		where: { id: { in: assigned.map((x) => x.id) }, conferenceId },
		with: { members: true }
	});
	const plan = planDelegationMerge(assigned, existing);
	// Everybody placed on the carrier must already be registered in this conference.
	await assertParticipantsOf(
		conferenceId,
		plan.newMembers.map((member) => member.userId)
	);

	if (plan.leavingUserIds.length > 0) {
		// Remove the delegations those users are coming from.
		await deleteDelegationsOf(tx, conferenceId, plan.leavingUserIds);
	}

	const carrierId = await carrierDelegationId(tx, conferenceId, plan.primaryId, assign);

	for (const member of plan.newMembers) {
		await tx
			.insert(schema.delegationMember)
			.values({ conferenceId, delegationId: carrierId, ...member });
	}

	await reconnectSupervisorsOf(tx, conferenceId, carrierId);
}

// The assignment run rewrites registrations wholesale, across three tables.
const delegationPubsub = rumblePubsub({ table: 'delegation' });
const delegationMemberPubsub = rumblePubsub({ table: 'delegationMember' });
const singleParticipantPubsub = rumblePubsub({ table: 'singleParticipant' });

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
					(await ctx.abilities.conference.filter('update')).merge({
						where: { id: args.conferenceId }
					}).query.single
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
					await splitDelegation(tx, conference.id, parent.id, children);
				}

				// 2. Single participant roles.
				for (const participant of data.singleParticipants) {
					if (!participant.assignedRole) continue;
					const role = await tx.query.customConferenceRole.findFirst({
						where: { id: participant.assignedRole.id, conferenceId: conference.id },
						columns: { id: true }
					});
					if (!role) {
						throw new GraphQLError(`Role ${participant.assignedRole.id} is not of this conference`);
					}
					await tx
						.update(schema.singleParticipant)
						.set({ assignedRoleId: role.id })
						.where(
							and(
								eq(schema.singleParticipant.id, participant.id),
								eq(schema.singleParticipant.conferenceId, conference.id)
							)
						);
				}

				// 3. Merge the delegations assigned to each nation, then each non-state actor.
				// The project names its roles itself; only the ones this conference offers count.
				const offered = await db.query.conference
					.findFirst({
						where: { id: conference.id },
						columns: {},
						with: {
							committees: { columns: {}, with: { nations: { columns: { alpha3Code: true } } } },
							nonStateActors: { columns: { id: true } }
						}
					})
					.then(assertFindFirstExists);
				const offeredNations = new Set(
					offered.committees.flatMap((committee) => committee.nations.map((n) => n.alpha3Code))
				);
				const offeredNsas = new Set(offered.nonStateActors.map((nsa) => nsa.id));

				for (const nation of nationSeats(data.conference.committees)) {
					if (!offeredNations.has(nation.nation.alpha3Code)) continue;
					await mergeAssignedDelegations(
						tx,
						conference.id,
						data.delegations.filter(
							(x) => x.assignedNation?.alpha2Code === nation.nation.alpha2Code
						),
						{ nationAlpha3Code: nation.nation.alpha3Code }
					);
				}

				for (const nsa of data.conference.nonStateActors) {
					if (!offeredNsas.has(nsa.id)) continue;
					await mergeAssignedDelegations(
						tx,
						conference.id,
						data.delegations.filter((x) => x.assignedNSA?.id === nsa.id),
						{ nonStateActorId: nsa.id }
					);
				}
			});

			delegationPubsub.updated();
			delegationMemberPubsub.updated();
			singleParticipantPubsub.updated();

			return true;
		}
	})
}));
