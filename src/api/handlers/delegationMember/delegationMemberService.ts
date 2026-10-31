import { type Transaction, db, schema } from '#api/db/db';
import {
	conferenceParticipantPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '#api/handlers/conferenceParticipant/conferenceParticipantService';
import { resolveSchoolChoice, type SchoolChoice } from '#api/handlers/school/schoolService';
import { fetchParticipationsAndTeamMembership } from '#api/services/registration/participation';
import { makeEntryCode } from '#api/services/registration/entryCodeGenerator';
import { tidyRoleApplications } from '#api/handlers/roleApplication/tidyRoleApplications';
import { assertRegistrationOpen } from '#api/services/registration/applicationReadiness';
import { m } from '#lib/paraglide/messages';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { apiError, codeNotFound, isSerializationFailure } from '#api/services/errors';
import { markSeatedFromWaitingList } from '#api/handlers/waitingListEntry/waitingListEntryService';
import type { CommitteeMove } from './delegationMemberPermissions';
import type { ConferenceRoleKind } from '#lib/helpers/conferenceRole';
import { assertFindFirstExists } from '@m1212e/rumble';
import type { SeatSwitch } from '#lib/helpers/seatSwitch';
import { normalizeEntryCode } from '#lib/helpers/entryCode';
import { headDelegateChanges, isSameSeat, type Seat } from './seatSwitch';

/**
 * Joining a delegation by entry code, with the school the newcomer names as their own (leaving it
 * out keeps one they already have). Refuses (CONFLICT) outside the registration window, an
 * applied delegation, and somebody who already takes part in the conference; a wrong code is
 * NOT_FOUND. Returns the id of the new member.
 */
export async function joinDelegationByEntryCode({
	userId,
	conferenceId,
	entryCode,
	school
}: {
	userId: string;
	conferenceId: string;
	entryCode: string;
	school: SchoolChoice;
}) {
	await assertRegistrationOpen(conferenceId);
	const delegation = await db.query.delegation.findFirst({
		where: { conferenceId, entryCode: normalizeEntryCode(entryCode) },
		columns: { id: true, conferenceId: true, applied: true }
	});
	if (!delegation) throw codeNotFound();

	if (delegation.applied) {
		throw apiError({ code: 'CONFLICT', message: m.delegationHasAlreadyApplied() });
	}

	await fetchParticipationsAndTeamMembership({
		conferenceId: delegation.conferenceId,
		userId,
		throwIfAnyIsFound: true
	});

	// The person's row and the membership go in together, so a refused insert leaves neither.
	const created = await db.transaction(async (tx) => {
		const participantId = await ensureConferenceParticipant({
			tx,
			conferenceId: delegation.conferenceId,
			userId
		});
		const member = await tx
			.insert(schema.delegationMember)
			.values({
				delegationId: delegation.id,
				conferenceParticipantId: participantId,
				isHeadDelegate: false
			})
			.returning({ id: schema.delegationMember.id })
			.then(assertFirstEntryExists);
		await setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: await resolveSchoolChoice({ choice: school, tx })
		});

		// The delegation just grew, so applications it can no longer seat are dropped.
		await tidyRoleApplications({ delegationId: delegation.id, tx });

		return member;
	});
	delegationMemberPubsub.created();
	// its member count changed
	delegationPubsub.updated(delegation.id);

	return created.id;
}

/** What a member leaving their delegation changed, for `announceLeave`. */
type Leave = { delegationId: string; delegationRemoved: boolean; successorId?: string };

/**
 * Takes the member out of their delegation, in the caller's transaction: a leaving head delegate
 * hands the role to another member, and a delegation nobody is left in is deleted. The role
 * applications the smaller delegation can no longer seat are dropped.
 */
async function leaveDelegation({ tx, memberId }: { tx: Transaction; memberId: string }) {
	const [deleted] = await tx
		.delete(schema.delegationMember)
		.where(whereRows({ table: schema.delegationMember, filter: { id: memberId } }))
		.returning({
			delegationId: schema.delegationMember.delegationId,
			isHeadDelegate: schema.delegationMember.isHeadDelegate
		});
	if (!deleted) {
		throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	}

	const remaining = await tx.query.delegationMember.findFirst({
		where: { delegationId: deleted.delegationId },
		columns: { id: true }
	});
	if (!remaining) {
		await tx
			.delete(schema.delegation)
			.where(whereRows({ table: schema.delegation, filter: { id: deleted.delegationId } }));
		return { delegationId: deleted.delegationId, delegationRemoved: true } satisfies Leave;
	}

	let successorId: string | undefined;
	if (deleted.isHeadDelegate) {
		await tx
			.update(schema.delegationMember)
			.set({ isHeadDelegate: true })
			.where(whereRows({ table: schema.delegationMember, filter: { id: remaining.id } }));
		successorId = remaining.id;
	}
	await tidyRoleApplications({ delegationId: deleted.delegationId, tx });
	return { delegationId: deleted.delegationId, delegationRemoved: false, successorId };
}

/** Announces a committed `leaveDelegation`. */
function announceLeave(leave: Leave) {
	delegationMemberPubsub.removed();
	if (leave.delegationRemoved) {
		delegationPubsub.removed();
		return;
	}
	if (leave.successorId) delegationMemberPubsub.updated(leave.successorId);
	// it lost a member, and maybe its head delegate
	delegationPubsub.updated(leave.delegationId);
}

/**
 * Removing a delegate the caller may remove (`assertCanDeleteDelegationMember`). If the head
 * delegate leaves, another member is promoted; if nobody is left, the delegation itself goes.
 */
export async function removeDelegationMember(id: string) {
	const member = await db.query.delegationMember
		.findFirst({ where: { id }, columns: { conferenceParticipantId: true } })
		.then(assertFindFirstExists);
	const leave = await db.transaction((tx) => leaveDelegation({ tx, memberId: id }));
	announceLeave(leave);
	// what the person takes part as changed
	conferenceParticipantPubsub.updated(member.conferenceParticipantId);
}

/** Placeholder details, so an assigned delegation looks "applied" like any other. */
const ASSIGNED_DELEGATION_INFOS = {
	applied: true,
	experience: 'No Info',
	motivation: 'Assigned by management'
};

/** What `clearParticipation` took away, for announcing it once committed. */
type ClearedParticipation = { leave?: Leave; removedSingle?: boolean };

/**
 * Takes the user's delegation membership or single registration in the conference away, in the
 * caller's transaction, so the team can seat them elsewhere; a membership is left as
 * `leaveDelegation` leaves it. Refuses (CONFLICT) a supervisor or team member: they cannot be
 * moved into a seat.
 */
async function clearParticipation({
	tx,
	conferenceId,
	userId
}: {
	tx: Transaction;
	conferenceId: string;
	userId: string;
}): Promise<ClearedParticipation> {
	const [participant, teamMember] = await Promise.all([
		tx.query.conferenceParticipant.findFirst({
			where: { conferenceId, userId },
			columns: { id: true },
			with: {
				delegationMember: { columns: { id: true } },
				singleParticipant: { columns: { id: true } },
				conferenceSupervisor: { columns: { id: true } }
			}
		}),
		tx.query.teamMember.findFirst({ where: { conferenceId, userId }, columns: { id: true } })
	]);
	if (teamMember || participant?.conferenceSupervisor) {
		throw apiError({ code: 'CONFLICT', message: m.delegationMemberUserAlreadyInConference() });
	}
	if (participant?.delegationMember) {
		return { leave: await leaveDelegation({ tx, memberId: participant.delegationMember.id }) };
	}
	if (participant?.singleParticipant) {
		await tx.delete(schema.singleParticipant).where(
			whereRows({
				table: schema.singleParticipant,
				filter: { id: participant.singleParticipant.id }
			})
		);
		return { removedSingle: true };
	}
	return {};
}

/** Announces a committed `clearParticipation`. */
function announceCleared(cleared: ClearedParticipation) {
	if (cleared.leave) announceLeave(cleared.leave);
	if (cleared.removedSingle) singleParticipantPubsub.removed();
}

type AssignedDelegation = {
	id: string;
	members: { isHeadDelegate: boolean }[];
};

/**
 * The delegation that carries the role, in the caller's transaction: the existing one, or a new
 * one created for it (`created`). An existing delegation without members gets the placeholder
 * details.
 */
async function prepareAssignedDelegation({
	tx,
	conferenceId,
	assignedRoleId,
	existing
}: {
	tx: Transaction;
	conferenceId: string;
	assignedRoleId: string;
	existing: AssignedDelegation | undefined;
}): Promise<AssignedDelegation & { created: boolean }> {
	if (!existing) {
		const created = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				assignedRoleId,
				entryCode: makeEntryCode(),
				...ASSIGNED_DELEGATION_INFOS
			})
			.returning({ id: schema.delegation.id })
			.then(assertFirstEntryExists);
		return { id: created.id, members: [], created: true };
	}

	if (existing.members.length === 0) {
		await tx
			.update(schema.delegation)
			.set(ASSIGNED_DELEGATION_INFOS)
			.where(whereRows({ table: schema.delegation, filter: { id: existing.id } }));
	}
	return { ...existing, created: false };
}

/** Announces the delegation `prepareAssignedDelegation` found or created, once committed. */
function announceAssignedDelegation(delegation: { id: string; created: boolean }) {
	if (delegation.created) delegationPubsub.created();
	delegationPubsub.updated(delegation.id);
}

/**
 * Management placing a user straight into an assigned delegation, bypassing the normal
 * application flow; the caller checked the role and committee
 * (`assertCanCreateAppliedDelegationMember`). The user's other registration in the conference is
 * cleared first (`clearParticipation`), and the delegation is created on demand for the role if
 * none holds it yet. Returns the id of the new member.
 */
export async function placeUserInAssignedDelegation({
	conferenceId,
	userId,
	assignedRoleId,
	assignedCommitteeId
}: {
	conferenceId: string;
	userId: string;
	assignedRoleId: string;
	assignedCommitteeId?: string | null;
}) {
	const placed = await db.transaction(async (tx) => {
		const cleared = await clearParticipation({ tx, conferenceId, userId });

		// Looked up after clearing: the user may have just left this very delegation.
		const existing = await tx.query.delegation.findFirst({
			where: { conferenceId, assignedRoleId },
			columns: { id: true },
			with: { members: { columns: { isHeadDelegate: true } } }
		});
		const waiting = await markSeatedFromWaitingList({ tx, conferenceId, userId });
		const delegation = await prepareAssignedDelegation({
			tx,
			conferenceId,
			assignedRoleId,
			existing
		});

		const participantId = await ensureConferenceParticipant({ tx, conferenceId, userId });
		// Their own school: the one they waited with, else the one they had.
		await setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: waiting?.schoolId ?? undefined
		});
		const member = await tx
			.insert(schema.delegationMember)
			.values({
				conferenceParticipantId: participantId,
				delegationId: delegation.id,
				assignedCommitteeId: assignedCommitteeId ?? undefined,
				isHeadDelegate: !delegation.members.some((x) => x.isHeadDelegate)
			})
			.returning({ id: schema.delegationMember.id })
			.then(assertFirstEntryExists);

		return { memberId: member.id, cleared, delegation };
	});
	announceCleared(placed.cleared);
	announceAssignedDelegation(placed.delegation);
	delegationMemberPubsub.created();
	return placed.memberId;
}

/**
 * Moves a delegate into a committee, as `assertCanMoveDelegationMemberToCommittee` checked and
 * loaded. Committees have a per-delegation seat limit: when the target is already full for this
 * delegation, participant care (`mayDisplace`) moves the longest-untouched occupant into the seat
 * this member is leaving - a swap, rather than a refusal; anybody else is refused (CONFLICT).
 */
export async function moveMemberToCommittee({ member, committee, mayDisplace }: CommitteeMove) {
	const siblings = member.delegation.members.filter((x) => x.id !== member.id);
	const occupying = siblings.filter((x) => x.assignedCommitteeId === committee.id);
	const displaced =
		occupying.length >= committee.numOfSeatsPerDelegation
			? occupying.toSorted((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[0]
			: undefined;
	if (displaced && !mayDisplace) {
		throw apiError({ code: 'CONFLICT', message: m.committeeSeatsExceeded() });
	}

	await db.transaction(async (tx) => {
		if (displaced) {
			await tx
				.update(schema.delegationMember)
				.set({ assignedCommitteeId: member.assignedCommitteeId ?? null })
				.where(whereRows({ table: schema.delegationMember, filter: { id: displaced.id } }));
		}

		await tx
			.update(schema.delegationMember)
			.set({ assignedCommitteeId: committee.id })
			.where(whereRows({ table: schema.delegationMember, filter: { id: member.id } }));
	});
	delegationMemberPubsub.updated(displaced ? [displaced.id, member.id] : member.id);
}

/** Refuses when a delegation of the given members now fills a committee beyond its seats. */
async function assertSeatLimits({ tx, memberIds }: { tx: Transaction; memberIds: string[] }) {
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
				throw apiError({ code: 'CONFLICT', message: m.committeeSeatsExceeded() });
			}
		}
	}
}

/**
 * Applies a committee assignment whose pairings `assertCanAssignCommittees` checked. One pairing
 * that breaks a seat limit (CONFLICT) rolls the whole batch back, which is why this runs in a
 * transaction rather than writing as it goes. Returns the ids of the members it seated.
 */
export async function assignCommittees(
	assignments: { delegationMemberId: string; committeeId?: string | null }[]
) {
	await db.transaction(async (tx) => {
		for (const assignment of assignments) {
			await tx
				.update(schema.delegationMember)
				.set({ assignedCommitteeId: assignment.committeeId ?? null })
				.where(
					whereRows({
						table: schema.delegationMember,
						filter: { id: assignment.delegationMemberId }
					})
				);
		}

		// Each committee seats a fixed number of every delegation; the assignment page checks
		// this too, but only the server can make it hold.
		await assertSeatLimits({
			tx,
			memberIds: assignments.map((assignment) => assignment.delegationMemberId)
		});
	});
	const memberIds = [...new Set(assignments.map((assignment) => assignment.delegationMemberId))];
	if (memberIds.length > 0) delegationMemberPubsub.updated(memberIds);
	return memberIds;
}

type SeatOf = Seat & { id: string };

/**
 * What a switch writes: the new seat per moved member, the switch the head delegates follow, and
 * whether a delegation had to be created for the target role.
 */
interface SeatSwitchPlan {
	seats: Map<string, Seat>;
	change: SeatSwitch;
	createdDelegation?: boolean;
}

function loadSeat({ tx, id }: { tx: Transaction; id: string }): Promise<SeatOf> {
	return tx.query.delegationMember
		.findFirst({
			where: { id },
			columns: { id: true, delegationId: true, assignedCommitteeId: true }
		})
		.then(assertFindFirstExists);
}

/** Both members take over each other's seat. */
async function swapSeats({
	tx,
	member,
	otherMemberId
}: {
	tx: Transaction;
	member: SeatOf;
	otherMemberId: string;
}): Promise<SeatSwitchPlan> {
	const other = await loadSeat({ tx, id: otherMemberId });
	if (isSameSeat(member, other))
		throw apiError({ code: 'CONFLICT', message: m.seatSwitchSameSeat() });
	return {
		seats: new Map([
			[
				member.id,
				{ delegationId: other.delegationId, assignedCommitteeId: other.assignedCommitteeId }
			],
			[
				other.id,
				{ delegationId: member.delegationId, assignedCommitteeId: member.assignedCommitteeId }
			]
		]),
		change: { kind: 'swap', memberId: member.id, otherMemberId: other.id }
	};
}

/**
 * How many people one seat of the role takes: a nation's seat is per committee (one that seats
 * it), a non-state actor's has no committee and counts the role's seats in total.
 */
async function seatCapacity({
	tx,
	role,
	committeeId
}: {
	tx: Transaction;
	role: { id: string; kind: ConferenceRoleKind; seatAmount: number | null };
	committeeId: string | null;
}) {
	if (role.kind !== 'NATION') {
		if (committeeId)
			throw apiError({ code: 'INVALID_INPUT', message: m.seatSwitchInvalidTarget() });
		return role.seatAmount ?? 0;
	}
	if (!committeeId) throw apiError({ code: 'INVALID_INPUT', message: m.seatSwitchInvalidTarget() });
	const committee = await tx.query.committee.findFirst({
		where: { id: committeeId, roles: { id: role.id } },
		columns: { numOfSeatsPerDelegation: true }
	});
	if (!committee)
		throw apiError({ code: 'INVALID_INPUT', message: m.committeeDoesNotBelongToConferenceError() });
	return committee.numOfSeatsPerDelegation;
}

/** The member takes a free seat of a role, whose delegation is created if it has none yet. */
async function moveToFreeSeat({
	tx,
	member,
	conferenceId,
	roleId,
	committeeId
}: {
	tx: Transaction;
	member: SeatOf;
	conferenceId: string;
	roleId: string;
	committeeId: string | null;
}): Promise<SeatSwitchPlan> {
	const role = await tx.query.conferenceRole
		.findFirst({
			where: { id: roleId, conferenceId },
			columns: { id: true, kind: true, seatAmount: true }
		})
		.then(assertFindFirstExists);
	const capacity = await seatCapacity({ tx, role, committeeId });
	const existing = await tx.query.delegation.findFirst({
		where: { conferenceId, assignedRoleId: roleId },
		columns: { id: true },
		with: { members: { columns: { id: true, isHeadDelegate: true, assignedCommitteeId: true } } }
	});
	if (
		existing &&
		isSameSeat(member, { delegationId: existing.id, assignedCommitteeId: committeeId })
	) {
		throw apiError({ code: 'CONFLICT', message: m.seatSwitchSameSeat() });
	}

	const occupied = (existing?.members ?? []).filter(
		(x) => x.id !== member.id && (role.kind !== 'NATION' || x.assignedCommitteeId === committeeId)
	);
	if (occupied.length >= capacity)
		throw apiError({ code: 'CONFLICT', message: m.seatSwitchSeatTaken() });

	const delegation = await prepareAssignedDelegation({
		tx,
		conferenceId,
		assignedRoleId: roleId,
		existing
	});
	return {
		seats: new Map([
			[member.id, { delegationId: delegation.id, assignedCommitteeId: committeeId }]
		]),
		change: { kind: 'move', memberId: member.id, targetDelegationId: delegation.id },
		createdDelegation: delegation.created
	};
}

/** A switch names either another member or a free seat, never both. */
function planSeatSwitch({
	tx,
	member,
	args
}: {
	tx: Transaction;
	member: SeatOf;
	args: SeatSwitchArgs;
}) {
	const { otherMemberId, targetRoleId } = args;
	if (otherMemberId && !targetRoleId) return swapSeats({ tx, member, otherMemberId });
	if (targetRoleId && !otherMemberId) {
		return moveToFreeSeat({
			tx,
			member,
			conferenceId: args.conferenceId,
			roleId: targetRoleId,
			committeeId: args.targetCommitteeId ?? null
		});
	}
	throw apiError({ code: 'INVALID_INPUT', message: m.seatSwitchInvalidTarget() });
}

/**
 * Moves the members into their new seats and sets the head delegates of the delegations involved:
 * the mover's own and the ones it lands in (which, for a swap, include the other member's).
 * Returns the ids of those delegations.
 */
async function writeSeatSwitch({
	tx,
	plan,
	fromDelegationId,
	chosenHeadDelegateIds
}: {
	tx: Transaction;
	plan: SeatSwitchPlan;
	fromDelegationId: string;
	chosenHeadDelegateIds: readonly string[] | null | undefined;
}) {
	const delegationIds = [
		...new Set([fromDelegationId, ...[...plan.seats.values()].map((x) => x.delegationId)])
	];
	const members = await tx.query.delegationMember.findMany({
		where: { delegationId: { in: delegationIds } },
		columns: { id: true, delegationId: true, isHeadDelegate: true }
	});
	const headChanges = headDelegateChanges({
		before: members,
		change: plan.change,
		chosenHeadDelegateIds
	});
	if (!headChanges)
		throw apiError({ code: 'INVALID_INPUT', message: m.seatSwitchHeadDelegatesInvalid() });

	for (const [id, seat] of plan.seats) {
		await tx
			.update(schema.delegationMember)
			.set(seat)
			.where(whereRows({ table: schema.delegationMember, filter: { id } }));
	}
	for (const { id, isHeadDelegate } of headChanges) {
		await tx
			.update(schema.delegationMember)
			.set({ isHeadDelegate })
			.where(whereRows({ table: schema.delegationMember, filter: { id } }));
	}
	return { delegationIds, headDelegateIds: headChanges.map((change) => change.id) };
}

export interface SeatSwitchArgs {
	conferenceId: string;
	memberId: string;
	/** Swap with this member, … */
	otherMemberId?: string | null;
	/** … or move into a free seat of this role (in this committee, for a nation). */
	targetRoleId?: string | null;
	targetCommitteeId?: string | null;
	/** The head delegates chosen for the delegations involved; left out keeps the defaults. */
	headDelegateMemberIds?: readonly string[] | null;
}

/**
 * Swaps the seats (delegation and committee) of two delegates, or moves one into a free seat. The
 * caller checked every id (`assertCanSwitchDelegationMemberSeats`). Serializable, since the seat
 * counts and head delegate checks read rows a concurrent switch may change; losing against one is
 * a CONFLICT to retry. Returns the members moved.
 */
export async function switchSeats(args: SeatSwitchArgs) {
	let switched: {
		memberIds: string[];
		delegationIds: string[];
		headDelegateIds: string[];
		createdDelegation: boolean;
	};
	try {
		switched = await db.transaction(
			async (tx) => {
				const member = await loadSeat({ tx, id: args.memberId });
				const plan = await planSeatSwitch({ tx, member, args });
				const written = await writeSeatSwitch({
					tx,
					plan,
					fromDelegationId: member.delegationId,
					chosenHeadDelegateIds: args.headDelegateMemberIds
				});
				return {
					memberIds: [...plan.seats.keys()],
					...written,
					createdDelegation: plan.createdDelegation ?? false
				};
			},
			{ isolationLevel: 'serializable' }
		);
	} catch (error) {
		if (isSerializationFailure(error))
			throw apiError({ code: 'CONFLICT', message: m.seatSwitchConflict() });
		throw error;
	}
	// the moved members and those whose head delegate flag changed
	delegationMemberPubsub.updated([
		...new Set([...switched.memberIds, ...switched.headDelegateIds])
	]);
	if (switched.createdDelegation) delegationPubsub.created();
	delegationPubsub.updated(switched.delegationIds);
	return switched.memberIds;
}
