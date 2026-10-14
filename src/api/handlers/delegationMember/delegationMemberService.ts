import { type Transaction, db, schema } from '$api/db/db';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/registration/participation';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import { assignedRoleConditions, nullToUndefined } from '$api/services/args';
import { tidyRoleApplications } from '$api/services/registration/tidyRoleApplications';
import type { ApiContext } from '$api/rumble';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray } from 'drizzle-orm';
import { apiError } from '$api/services/apiError';

/** Joining a delegation by entry code. Returns the id of the new member. */
export async function joinDelegationByEntryCode(
	userId: string,
	conferenceId: string,
	entryCode: string
) {
	const delegation = await db.query.delegation
		.findFirst({ where: { conferenceId, entryCode } })
		.then(assertFindFirstExists);

	if (delegation.applied) {
		throw apiError('CONFLICT', m.delegationHasAlreadyApplied());
	}

	await fetchUserParticipations({
		conferenceId: delegation.conferenceId,
		userId,
		throwIfAnyIsFound: true
	});

	const created = await db
		.insert(schema.delegationMember)
		.values({
			conferenceId: delegation.conferenceId,
			delegationId: delegation.id,
			userId,
			isHeadDelegate: false
		})
		.returning()
		.then(assertFirstEntryExists);

	// The delegation just grew, so applications it can no longer seat are dropped.
	await tidyRoleApplications(delegation.id);

	return created.id;
}

/**
 * Removing a delegate. If the head delegate leaves, another member is promoted; if nobody is
 * left, the delegation itself goes. Same ordering as the legacy resolver. Returns the id of the
 * delegation, or undefined when it went with its last member.
 */
export async function removeDelegationMember(ctx: ApiContext, id: string) {
	const deletable = (await ctx.abilities.delegationMember.filter('delete')).merge({
		where: { id }
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
			throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
		}

		if (deleted.isHeadDelegate) {
			const successor = await tx.query.delegationMember.findFirst({
				where: { delegationId: deleted.delegationId }
			});

			if (!successor) {
				await tx.delete(schema.delegation).where(eq(schema.delegation.id, deleted.delegationId));
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

	return delegationId;
}

/** Refuses a nation, non-state actor or committee that the conference does not have. */
export async function assertOfferedIn(
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
		throw apiError('INVALID_INPUT', m.roleNotOnOffer());
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
		throw apiError('CONFLICT', m.delegationMemberUserAlreadyInConference());
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

/**
 * Management placing a user straight into an assigned delegation, bypassing the normal
 * application flow. The delegation is created on demand for the nation or non-state actor if
 * none exists yet. Returns the id of the new member.
 */
export async function placeUserInAssignedDelegation(args: {
	conferenceId: string;
	userId: string;
	assignedNationAlpha3Code?: string | null;
	assignedNonStateActorId?: string | null;
	assignedCommitteeId?: string | null;
}) {
	return db.transaction(async (tx) => {
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
}

/**
 * Moves a delegate into a committee. Committees have a per-delegation seat limit, so when the
 * target is already full for this delegation the longest-untouched occupant is displaced into
 * the seat this member is leaving - a swap, rather than a refusal.
 */
export async function moveMemberToCommittee(
	ctx: ApiContext,
	id: string,
	assignedCommitteeId: string
) {
	const updatable = (await ctx.abilities.delegationMember.filter('update')).merge({
		where: { id }
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
			.findFirst({ where: { id: assignedCommitteeId, conferenceId: member.conferenceId } })
			.then(assertFindFirstExists);

		const siblings = (member.delegation?.members ?? []).filter((x) => x.id !== member.id);
		const occupying = siblings.filter((x) => x.assignedCommitteeId === assignedCommitteeId);

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
			.set({ assignedCommitteeId })
			.where(updatable.sql.where);
	});
}

/** Bulk committee (un)assignment; a null committee clears the assignment. Returns the count. */
export async function moveManyMembersToCommittee(
	ctx: ApiContext,
	conferenceId: string,
	ids: string[],
	assignedCommitteeId: string | null | undefined
) {
	if (assignedCommitteeId) {
		await db.query.committee
			.findFirst({ where: { id: assignedCommitteeId, conferenceId } })
			.then(assertFindFirstExists);
	}

	const updated = await db
		.update(schema.delegationMember)
		.set({ assignedCommitteeId: assignedCommitteeId ?? null })
		.where(
			and(
				(await ctx.abilities.delegationMember.filter('update')).merge({
					where: { conferenceId }
				}).sql.where,
				inArray(schema.delegationMember.id, ids)
			)
		)
		.returning({ id: schema.delegationMember.id });

	return updated.length;
}

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
				throw apiError('CONFLICT', m.committeeSeatsExceeded());
			}
		}
	}
}

/**
 * Applies the committee assignment produced by the assignment assistant.
 *
 * Each pairing is validated before it is written: the committee must belong to the same
 * conference as the delegate, and it must actually seat the delegation's assigned nation.
 * One bad pairing rolls the whole batch back, which is why this runs in a transaction rather
 * than writing as it goes.
 */
export async function assignCommittees(
	ctx: ApiContext,
	assignments: { delegationMemberId: string; committeeId: string }[]
) {
	await db.transaction(async (tx) => {
		for (const assignment of assignments) {
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
				throw apiError('INVALID_INPUT', m.committeeDoesNotBelongToConferenceError());
			}

			const nationCode = member.delegation?.assignedNationAlpha3Code ?? '';
			if (!committee.nations.some((nation) => nation.alpha3Code === nationCode)) {
				throw apiError('INVALID_INPUT', m.committeeDoesNotBelongToConferenceError());
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
			assignments.map((assignment) => assignment.delegationMemberId)
		);
	});
}
