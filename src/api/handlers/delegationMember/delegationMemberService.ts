import { type Transaction, db, schema } from '$api/db/db';
import { ensureConferenceParticipant } from '$api/handlers/conferenceParticipant/conferenceParticipantService';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/registration/participation';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import { nullToUndefined } from '$api/services/args';
import { tidyRoleApplications } from '$api/services/registration/tidyRoleApplications';
import { m } from '#lib/paraglide/messages.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import { apiError } from '$api/services/errors/apiError';
import { markSeatedFromWaitingList } from '$api/handlers/waitingListEntry/waitingListEntryService';
import type { CommitteeMove } from './delegationMemberPermissions';

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

	// The person's row and the membership go in together, so a refused insert leaves neither.
	const created = await db.transaction(async (tx) => {
		const member = await tx
			.insert(schema.delegationMember)
			.values({
				delegationId: delegation.id,
				conferenceParticipantId: await ensureConferenceParticipant(
					tx,
					delegation.conferenceId,
					userId
				),
				isHeadDelegate: false
			})
			.returning()
			.then(assertFirstEntryExists);

		// The delegation just grew, so applications it can no longer seat are dropped.
		await tidyRoleApplications(delegation.id, tx);

		return member;
	});

	return created.id;
}

/**
 * Removing a delegate. If the head delegate leaves, another member is promoted; if nobody is
 * left, the delegation itself goes. Same ordering as the legacy resolver. Returns the id of the
 * delegation, or undefined when it went with its last member. The caller checks first that the
 * delegate may be removed (`assertCanDeleteDelegationMember`).
 */
export async function removeDelegationMember(id: string) {
	const delegationId = await db.transaction(async (tx) => {
		const [deleted] = await tx
			.delete(schema.delegationMember)
			.where(eq(schema.delegationMember.id, id))
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

		// Only meaningful while the delegation still exists.
		await tidyRoleApplications(deleted.delegationId, tx);

		return deleted.delegationId;
	});

	return delegationId;
}

/** Placeholder details, so an assigned delegation looks "applied" like any other. */
const ASSIGNED_DELEGATION_INFOS = {
	applied: true,
	experience: 'No Info',
	motivation: 'Assigned by management'
};

/** Removes the user's delegation membership or single registration in the conference, if any. */
async function clearParticipation(tx: Transaction, conferenceId: string, userId: string) {
	if (!(await isUserAlreadyRegistered({ userId, conferenceId }))) return;

	const participant = await tx.query.conferenceParticipant.findFirst({
		where: { conferenceId, userId },
		columns: { id: true }
	});
	// Registered, but only on the team: nothing to clear, and nothing to move either.
	if (!participant) {
		throw apiError('CONFLICT', m.delegationMemberUserAlreadyInConference());
	}

	const removedMember = await tx
		.delete(schema.delegationMember)
		.where(eq(schema.delegationMember.conferenceParticipantId, participant.id))
		.returning({ id: schema.delegationMember.id });
	if (removedMember.length > 0) return;

	const removedSingle = await tx
		.delete(schema.singleParticipant)
		.where(eq(schema.singleParticipant.conferenceParticipantId, participant.id))
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
	assignedRoleId: string,
	existing: AssignedDelegation | undefined,
	schoolId: string | null | undefined
): Promise<AssignedDelegation> {
	if (!existing) {
		const created = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				assignedRoleId,
				entryCode: makeEntryCode(),
				schoolId: schoolId ?? undefined,
				...ASSIGNED_DELEGATION_INFOS
			})
			.returning()
			.then(assertFirstEntryExists);
		return { ...created, members: [] };
	}

	if (existing.members.length === 0) {
		await tx
			.update(schema.delegation)
			.set({ ...ASSIGNED_DELEGATION_INFOS, schoolId: schoolId ?? null })
			.where(eq(schema.delegation.id, existing.id));
	}
	return existing;
}

/**
 * Management placing a user straight into an assigned delegation, bypassing the normal
 * application flow. The delegation is created on demand for the role if none holds it yet.
 * Returns the id of the new member.
 */
export async function placeUserInAssignedDelegation(args: {
	conferenceId: string;
	userId: string;
	assignedRoleId: string;
	assignedCommitteeId?: string | null;
}) {
	return db.transaction(async (tx) => {
		const existing = await tx.query.delegation.findFirst({
			where: { conferenceId: args.conferenceId, assignedRoleId: args.assignedRoleId },
			with: { members: true }
		});

		// Existing participation is cleared first, so the user can be moved.
		await clearParticipation(tx, args.conferenceId, args.userId);

		const waiting = await markSeatedFromWaitingList(tx, args.conferenceId, args.userId);
		const delegation = await prepareAssignedDelegation(
			tx,
			args.conferenceId,
			args.assignedRoleId,
			existing,
			waiting?.schoolId
		);

		const member = await tx
			.insert(schema.delegationMember)
			.values({
				conferenceParticipantId: await ensureConferenceParticipant(
					tx,
					args.conferenceId,
					args.userId
				),
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
 * the seat this member is leaving - a swap, rather than a refusal. Takes what
 * `assertCanMoveDelegationMemberToCommittee` checked and loaded.
 */
export async function moveMemberToCommittee({ member, committee }: CommitteeMove) {
	await db.transaction(async (tx) => {
		const siblings = (member.delegation?.members ?? []).filter((x) => x.id !== member.id);
		const occupying = siblings.filter((x) => x.assignedCommitteeId === committee.id);

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
			.set({ assignedCommitteeId: committee.id })
			.where(eq(schema.delegationMember.id, member.id));
	});
}

/**
 * Bulk committee (un)assignment; a null committee clears the assignment. Only the delegates
 * matching `updatableWhere` (`authorizeDelegationMemberCommitteeMoves`) are written. Returns the
 * count.
 */
export async function moveManyMembersToCommittee(
	ids: string[],
	assignedCommitteeId: string | null | undefined,
	updatableWhere: SQL | undefined
) {
	const updated = await db
		.update(schema.delegationMember)
		.set({ assignedCommitteeId: assignedCommitteeId ?? null })
		.where(and(updatableWhere, inArray(schema.delegationMember.id, ids)))
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
 * Applies the committee assignment produced by the assignment assistant, whose pairings
 * `assertCanAssignCommittees` checked. One pairing that breaks a seat limit rolls the whole batch
 * back, which is why this runs in a transaction rather than writing as it goes.
 */
export async function assignCommittees(
	assignments: { delegationMemberId: string; committeeId: string }[]
) {
	await db.transaction(async (tx) => {
		for (const assignment of assignments) {
			await tx
				.update(schema.delegationMember)
				.set({ assignedCommitteeId: assignment.committeeId })
				.where(eq(schema.delegationMember.id, assignment.delegationMemberId));
		}

		// Each committee seats a fixed number of every delegation; the assignment page checks
		// this too, but only the server can make it hold.
		await assertSeatLimits(
			tx,
			assignments.map((assignment) => assignment.delegationMemberId)
		);
	});
}
