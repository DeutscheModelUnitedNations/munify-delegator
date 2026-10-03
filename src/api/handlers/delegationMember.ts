import { type Transaction, db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isInOwnDelegation,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { fetchUserParticipations, isUserAlreadyRegistered } from '$api/services/participation';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import { assignedRoleConditions, countGiven, nullToUndefined } from '$api/services/args';
import { assertTeamRole } from '$api/services/authHelper';
import { tidyRoleApplications } from '$api/services/tidyRoleApplications';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { and, eq, inArray } from 'drizzle-orm';

// Ported from abilities/entities/delegationMember.ts
abilityBuilder.delegationMember.allow(['read', 'update', 'delete']).when(systemAdmin);

// Co-delegates see each other.
abilityBuilder.delegationMember.allow('read').when((ctx) => where(isInOwnDelegation(ctx)));

// Supervisors see the delegates of the delegations they supervise.
abilityBuilder.delegationMember.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { delegation: { members: { supervisors: { user: { id } } } } } } : undefined;
});

// Project management and participant care manage their conference's delegation members.
abilityBuilder.delegationMember
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

// Only the head delegate may remove a delegate, and only before the delegation has applied.
abilityBuilder.delegationMember.allow('delete').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					delegation: { applied: false, members: { isHeadDelegate: true, user: { id } } }
				}
			}
		: undefined;
});

// Anyone may leave a delegation that has not applied yet.
abilityBuilder.delegationMember.allow('delete').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { user: { id }, delegation: { applied: false } } } : undefined;
});

// The head delegate may edit members who have no committee assigned yet.
abilityBuilder.delegationMember.allow('update').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					assignedCommitteeId: { isNull: true },
					delegation: { members: { isHeadDelegate: true, user: { id } } }
				}
			}
		: undefined;
});

const DelegationMemberRef = object({ table: 'delegationMember' });
query({ table: 'delegationMember' });
const pubsub = rumblePubsub({ table: 'delegationMember' });
// This handler also writes these, and a subscriber watching them has to hear about it.
const delegationPubsub = rumblePubsub({ table: 'delegation' });
const waitingListEntryPubsub = rumblePubsub({ table: 'waitingListEntry' });
const singleParticipantPubsub = rumblePubsub({ table: 'singleParticipant' });

schemaBuilder.mutationFields((t) => ({
	/** Joining a delegation by entry code. */
	createDelegationMember: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw new GraphQLError('Must be logged in');
			}

			const delegation = await db.query.delegation
				.findFirst({ where: { conferenceId: args.conferenceId, entryCode: args.entryCode } })
				.then(assertFindFirstExists);

			if (delegation.applied) {
				throw new GraphQLError(m.delegationHasAlreadyApplied());
			}

			await fetchUserParticipations({
				conferenceId: delegation.conferenceId,
				userId: id,
				throwIfAnyIsFound: true
			});

			const created = await db
				.insert(schema.delegationMember)
				.values({
					conferenceId: delegation.conferenceId,
					delegationId: delegation.id,
					userId: id,
					isHeadDelegate: false
				})
				.returning()
				.then(assertFirstEntryExists);

			// The delegation just grew, so applications it can no longer seat are dropped.
			await tidyRoleApplications(delegation.id);

			pubsub.created();

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Removing a delegate. If the head delegate leaves, another member is promoted; if nobody is
	 * left, the delegation itself goes. Same ordering as the legacy resolver.
	 */
	deleteDelegationMember: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deletable = (await ctx.abilities.delegationMember.filter('delete')).merge({
				where: { id: args.id }
			});

			const delegationId = await db.transaction(async (tx) => {
				const [deleted] = await tx
					.delete(schema.delegationMember)
					.where(deletable.sql.where)
					.returning({
						id: schema.delegationMember.id,
						delegationId: schema.delegationMember.delegationId,
						isHeadDelegate: schema.delegationMember.isHeadDelegate
					});

				if (!deleted) {
					throw new GraphQLError('Delegation member not found, or not yours to delete');
				}

				if (deleted.isHeadDelegate) {
					const successor = await tx.query.delegationMember.findFirst({
						where: { delegationId: deleted.delegationId }
					});

					if (!successor) {
						await tx
							.delete(schema.delegation)
							.where(eq(schema.delegation.id, deleted.delegationId));
						return undefined;
					}

					await tx
						.update(schema.delegationMember)
						.set({ isHeadDelegate: true })
						.where(eq(schema.delegationMember.id, successor.id));
				}

				return deleted.delegationId;
			});

			// Only meaningful while the delegation still exists.
			if (delegationId) {
				await tidyRoleApplications(delegationId);
			}

			pubsub.removed();
			// The delegation either lost its last member and went with it, or had a new head
			// delegate promoted into place.
			if (delegationId) {
				delegationPubsub.updated(delegationId);
			} else {
				delegationPubsub.removed();
			}

			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Delegation members left without a committee, in delegations that were never assigned a nation
	 * or non-state actor - i.e. everyone who did not make it into the conference.
	 *
	 * Rows are read before deletion so the caller still gets them back, which is what the legacy
	 * resolver did - after the delete there is nothing left to query.
	 */
	deleteDeadDelegationMembers: t.drizzleField({
		type: [DelegationMemberRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const filter = (await ctx.abilities.delegationMember.filter('delete')).merge({
				where: {
					assignedCommitteeId: { isNull: true },
					delegation: {
						assignedNationAlpha3Code: { isNull: true },
						assignedNonStateActorId: { isNull: true }
					},
					conferenceId: args.conferenceId
				}
			});

			// Read before deleting: afterwards there is nothing left to return.
			const doomed = await db.query.delegationMember.findMany(query(filter.query.many));
			if (doomed.length === 0) return [];

			await db.delete(schema.delegationMember).where(filter.sql.where);
			pubsub.removed();

			return doomed;
		}
	})
}));

/** Refuses a nation, non-state actor or committee that the conference does not have. */
async function assertOfferedIn(
	conferenceId: string,
	role: {
		assignedNationAlpha3Code?: string | null;
		assignedNonStateActorId?: string | null;
		assignedCommitteeId?: string | null;
	}
) {
	const [nation, nsa, committee] = await Promise.all([
		role.assignedNationAlpha3Code
			? db.query.nation.findFirst({
					where: {
						alpha3Code: role.assignedNationAlpha3Code,
						committees: { conferenceId }
					},
					columns: { alpha3Code: true }
				})
			: true,
		role.assignedNonStateActorId
			? db.query.nonStateActor.findFirst({
					where: { id: role.assignedNonStateActorId, conferenceId },
					columns: { id: true }
				})
			: true,
		role.assignedCommitteeId
			? db.query.committee.findFirst({
					where: { id: role.assignedCommitteeId, conferenceId },
					columns: { id: true }
				})
			: true
	]);
	if (!nation || !nsa || !committee) {
		throw new GraphQLError('This role is not on offer in the conference');
	}
}

/** Placeholder details, so an assigned delegation looks "applied" like any other. */
const ASSIGNED_DELEGATION_INFOS = {
	applied: true,
	experience: 'No Info',
	school: 'No Info',
	motivation: 'Assigned by management'
};

/** Removes the user's delegation membership or single registration in the conference, if any. */
async function clearParticipation(tx: Transaction, conferenceId: string, userId: string) {
	if (!(await isUserAlreadyRegistered({ userId, conferenceId }))) return;

	const removedMember = await tx
		.delete(schema.delegationMember)
		.where(
			and(
				eq(schema.delegationMember.conferenceId, conferenceId),
				eq(schema.delegationMember.userId, userId)
			)
		)
		.returning({ id: schema.delegationMember.id });
	if (removedMember.length > 0) return;

	const removedSingle = await tx
		.delete(schema.singleParticipant)
		.where(
			and(
				eq(schema.singleParticipant.conferenceId, conferenceId),
				eq(schema.singleParticipant.userId, userId)
			)
		)
		.returning({ id: schema.singleParticipant.id });
	if (removedSingle.length === 0) {
		throw new GraphQLError(
			'User is already part of the conference and records could not be deleted'
		);
	}
}

type AssignedDelegation = { id: string; members: { isHeadDelegate: boolean }[] };

/**
 * The delegation that carries the role: the existing one, or a new one created for it. An
 * existing delegation without members gets the placeholder details.
 */
async function prepareAssignedDelegation(
	tx: Transaction,
	conferenceId: string,
	role: { assignedNationAlpha3Code?: string | null; assignedNonStateActorId?: string | null },
	existing: AssignedDelegation | undefined
): Promise<AssignedDelegation> {
	if (!existing) {
		const created = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				assignedNationAlpha3Code: nullToUndefined(role.assignedNationAlpha3Code),
				assignedNonStateActorId: nullToUndefined(role.assignedNonStateActorId),
				entryCode: makeEntryCode(),
				...ASSIGNED_DELEGATION_INFOS
			})
			.returning()
			.then(assertFirstEntryExists);
		return { ...created, members: [] };
	}

	if (existing.members.length === 0) {
		await tx
			.update(schema.delegation)
			.set(ASSIGNED_DELEGATION_INFOS)
			.where(eq(schema.delegation.id, existing.id));
	}
	return existing;
}

schemaBuilder.mutationFields((t) => ({
	/**
	 * Management placing a user straight into an assigned delegation, bypassing the normal
	 * application flow. The delegation is created on demand for the nation or non-state actor if
	 * none exists yet.
	 */
	createAppliedDelegationMember: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			assignedNationAlpha3Code: t.arg.string(),
			assignedNonStateActorId: t.arg.id(),
			assignedCommitteeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			if (countGiven(args.assignedNationAlpha3Code, args.assignedNonStateActorId) === 0) {
				throw new GraphQLError(
					'Either assignedNationAlpha3Code or assignedNonStateActorId must be provided'
				);
			}
			await assertOfferedIn(args.conferenceId, args);

			const memberId = await db.transaction(async (tx) => {
				const existing = await tx.query.delegation.findFirst({
					where: { conferenceId: args.conferenceId, OR: assignedRoleConditions(args) },
					with: { members: true }
				});

				// Existing participation is cleared first, so the user can be moved.
				await clearParticipation(tx, args.conferenceId, args.userId);

				const delegation = await prepareAssignedDelegation(tx, args.conferenceId, args, existing);

				// Best-effort: not every assigned user came from the waiting list.
				await tx
					.update(schema.waitingListEntry)
					.set({ assigned: true })
					.where(
						and(
							eq(schema.waitingListEntry.conferenceId, args.conferenceId),
							eq(schema.waitingListEntry.userId, args.userId)
						)
					);

				const member = await tx
					.insert(schema.delegationMember)
					.values({
						conferenceId: args.conferenceId,
						userId: args.userId,
						delegationId: delegation.id,
						assignedCommitteeId: nullToUndefined(args.assignedCommitteeId),
						isHeadDelegate: !delegation.members.some((m) => m.isHeadDelegate)
					})
					.returning()
					.then(assertFirstEntryExists);

				return member.id;
			});

			pubsub.created();
			delegationPubsub.created();
			waitingListEntryPubsub.updated();
			// An existing single registration for the same person is cleared out of the way.
			singleParticipantPubsub.removed();

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({ where: { id: memberId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Moves a delegate into a committee. Committees have a per-delegation seat limit, so when the
	 * target is already full for this delegation the longest-untouched occupant is displaced into
	 * the seat this member is leaving - a swap, rather than a refusal.
	 */
	updateDelegationMemberCommittee: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedCommitteeId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const updatable = (await ctx.abilities.delegationMember.filter('update')).merge({
				where: { id: args.id }
			});

			await db.transaction(async (tx) => {
				const member = await tx.query.delegationMember
					.findFirst({
						...updatable.query.single,
						with: { delegation: { with: { members: true } } }
					})
					.then(assertFindFirstExists);

				// A committee of the member's own conference, not any committee id at all.
				const committee = await tx.query.committee
					.findFirst({ where: { id: args.assignedCommitteeId, conferenceId: member.conferenceId } })
					.then(assertFindFirstExists);

				const siblings = (member.delegation?.members ?? []).filter((x) => x.id !== member.id);
				const occupying = siblings.filter(
					(x) => x.assignedCommitteeId === args.assignedCommitteeId
				);

				if (occupying.length >= committee.numOfSeatsPerDelegation) {
					const displaced = [...occupying].sort(
						(a, b) => (a.updatedAt?.getTime() ?? 0) - (b.updatedAt?.getTime() ?? 0)
					)[0];
					if (displaced) {
						await tx
							.update(schema.delegationMember)
							.set({ assignedCommitteeId: member.assignedCommitteeId ?? null })
							.where(eq(schema.delegationMember.id, displaced.id));
					}
				}

				await tx
					.update(schema.delegationMember)
					.set({ assignedCommitteeId: args.assignedCommitteeId })
					.where(updatable.sql.where);
			});

			pubsub.updated(args.id);

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Bulk committee (un)assignment; a null committee clears the assignment. */
	updateManyDelegationMemberCommittee: t.field({
		type: 'Int',
		args: {
			conferenceId: t.arg.id({ required: true }),
			ids: t.arg.idList({ required: true }),
			assignedCommitteeId: t.arg.id()
		},
		resolve: async (_root, args, ctx) => {
			if (args.ids.length === 0) return 0;
			if (args.assignedCommitteeId) {
				await db.query.committee
					.findFirst({ where: { id: args.assignedCommitteeId, conferenceId: args.conferenceId } })
					.then(assertFindFirstExists);
			}

			const updated = await db
				.update(schema.delegationMember)
				.set({ assignedCommitteeId: args.assignedCommitteeId ?? null })
				.where(
					and(
						(await ctx.abilities.delegationMember.filter('update')).merge({
							where: { conferenceId: args.conferenceId }
						}).sql.where,
						inArray(schema.delegationMember.id, args.ids)
					)
				)
				.returning({ id: schema.delegationMember.id });

			pubsub.updated(args.ids);

			return updated.length;
		}
	})
}));

/** Refuses when a delegation of the given members now fills a committee beyond its seats. */
async function assertSeatLimits(tx: Transaction, memberIds: string[]) {
	if (memberIds.length === 0) return;
	const delegations = await tx.query.delegation.findMany({
		where: { members: { id: { in: memberIds } } },
		with: { members: { columns: { assignedCommitteeId: true } } }
	});
	const committeeIds = [
		...new Set(
			delegations.flatMap((delegation) =>
				delegation.members.flatMap((member) => member.assignedCommitteeId ?? [])
			)
		)
	];
	if (committeeIds.length === 0) return;
	const committees = await tx.query.committee.findMany({
		where: { id: { in: committeeIds } },
		columns: { id: true, numOfSeatsPerDelegation: true }
	});
	const seats = new Map(committees.map((c) => [c.id, c.numOfSeatsPerDelegation]));
	for (const delegation of delegations) {
		const taken = Map.groupBy(
			delegation.members.flatMap((member) => member.assignedCommitteeId ?? []),
			(committeeId) => committeeId
		);
		for (const [committeeId, members] of taken) {
			if (members.length > (seats.get(committeeId) ?? 0)) {
				throw new GraphQLError('A committee has more members of this delegation than it seats');
			}
		}
	}
}

const CommitteeAssignmentInput = schemaBuilder.inputType('CommitteeAssignmentInput', {
	fields: (t) => ({
		delegationMemberId: t.id({ required: true }),
		committeeId: t.id({ required: true })
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Applies the committee assignment produced by the assignment assistant.
	 *
	 * Each pairing is validated before it is written: the committee must belong to the same
	 * conference as the delegate, and it must actually seat the delegation's assigned nation.
	 * One bad pairing rolls the whole batch back, which is why this runs in a transaction rather
	 * than writing as it goes.
	 */
	assignCommitteesToDelegationMembers: t.drizzleField({
		type: [DelegationMemberRef],
		args: {
			conferenceId: t.arg.id({ required: true }),
			assignments: t.arg({ type: [CommitteeAssignmentInput], required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await db.transaction(async (tx) => {
				for (const assignment of args.assignments) {
					const committee = await tx.query.committee
						.findFirst({ where: { id: assignment.committeeId }, with: { nations: true } })
						.then(assertFindFirstExists);

					const member = await tx.query.delegationMember
						.findFirst({
							...(await ctx.abilities.delegationMember.filter('update')).merge({
								where: { id: assignment.delegationMemberId }
							}).query.single,
							with: { delegation: true }
						})
						.then(assertFindFirstExists);

					if (committee.conferenceId !== member.conferenceId) {
						throw new GraphQLError(m.committeeDoesNotBelongToConferenceError());
					}

					const nationCode = member.delegation?.assignedNationAlpha3Code ?? '';
					if (!committee.nations.some((nation) => nation.alpha3Code === nationCode)) {
						throw new GraphQLError(m.committeeDoesNotBelongToConferenceError());
					}

					await tx
						.update(schema.delegationMember)
						.set({ assignedCommitteeId: assignment.committeeId })
						.where(eq(schema.delegationMember.id, member.id));
				}

				// Each committee seats a fixed number of every delegation; the assignment page checks
				// this too, but only the server can make it hold.
				await assertSeatLimits(
					tx,
					args.assignments.map((assignment) => assignment.delegationMemberId)
				);
			});

			pubsub.updated();

			return db.query.delegationMember.findMany(
				query(
					(await ctx.abilities.delegationMember.filter('read')).merge({
						where: { conferenceId: args.conferenceId }
					}).query.many
				)
			);
		}
	})
}));
