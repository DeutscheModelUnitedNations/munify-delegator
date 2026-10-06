import type { Prisma, RegionalBaseline } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';
import formatNames from '$lib/services/formatNames';
import { isValidManualTargets } from '$lib/services/seatPlanning/baselines';
import { regionalGroups } from '$lib/services/seatPlanning/unMembers';

/**
 * Guards for the seat planning tool. They are kept free of database access so the rules can be
 * unit tested; the resolvers feed them with what they queried.
 */

/**
 * Delegation members that block removing `nationAlpha3Code` from `committeeId`: members of the
 * delegation holding that nation who are assigned to exactly that committee.
 */
export function seatRemovalBlockersWhere(
	committeeId: string,
	nationAlpha3Code: string
): Prisma.DelegationMemberWhereInput {
	return {
		assignedCommitteeId: committeeId,
		delegation: { assignedNationAlpha3Code: nationAlpha3Code }
	};
}

interface AssignedMember {
	delegationId: string;
}

/**
 * The lowest `numOfSeatsPerDelegation` a committee can be set to without unassigning anyone:
 * the highest number of members a single delegation has assigned to it.
 */
function minSeatsPerDelegation(assignedMembers: AssignedMember[]) {
	const perDelegation = new Map<string, number>();
	for (const { delegationId } of assignedMembers) {
		perDelegation.set(delegationId, (perDelegation.get(delegationId) ?? 0) + 1);
	}
	return Math.max(0, ...perDelegation.values());
}

interface SeatCountCommittee {
	numOfSeatsPerDelegation: number;
	nations: unknown[];
}

/**
 * Every nation entry of a committee is worth `numOfSeatsPerDelegation` seats, every NSA its
 * `seatAmount`.
 */
export function totalSeats(
	committees: SeatCountCommittee[],
	nonStateActors: { seatAmount: number }[]
) {
	const committeeSeats = committees.reduce(
		(sum, committee) => sum + committee.nations.length * committee.numOfSeatsPerDelegation,
		0
	);
	const nsaSeats = nonStateActors.reduce((sum, nsa) => sum + nsa.seatAmount, 0);
	return committeeSeats + nsaSeats;
}

/**
 * Throws when `numOfSeatsPerDelegation` would leave a delegation with more members assigned to the
 * committee than it has seats there.
 */
export function assertSeatsPerDelegationAllowed(
	numOfSeatsPerDelegation: number | null | undefined,
	assignedMembers: AssignedMember[]
) {
	// not part of the update
	if (numOfSeatsPerDelegation == null) return;
	if (numOfSeatsPerDelegation < 1) {
		throw new GraphQLError(m.seatsPerDelegationAtLeastOne());
	}
	const min = minSeatsPerDelegation(assignedMembers);
	if (numOfSeatsPerDelegation < min) {
		throw new GraphQLError(m.seatsPerDelegationBelowAssigned({ min }));
	}
}

interface DelegationWithMembers {
	assignedNationAlpha3Code: string | null;
	members: {
		assignedCommitteeId: string | null;
		user: { given_name: string; family_name: string };
	}[];
}

/**
 * Committee seats that cannot be removed because members of the delegation holding the nation are
 * assigned to that committee, with the names of those members.
 */
export function lockedCommitteeSeats(delegations: DelegationWithMembers[]) {
	return delegations.flatMap(({ assignedNationAlpha3Code, members }) => {
		if (!assignedNationAlpha3Code) return [];

		const namesByCommittee = new Map<string, string[]>();
		for (const { assignedCommitteeId, user } of members) {
			if (!assignedCommitteeId) continue;
			const names = namesByCommittee.get(assignedCommitteeId) ?? [];
			names.push(formatNames(user.given_name, user.family_name));
			namesByCommittee.set(assignedCommitteeId, names);
		}

		return [...namesByCommittee].map(([committeeId, memberNames]) => ({
			committeeId,
			nationAlpha3Code: assignedNationAlpha3Code,
			memberNames
		}));
	});
}

interface NonStateActorUpdateInput {
	name?: string | null;
	abbreviation?: string | null;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	seatAmount?: number | null;
}

/**
 * Maps the optional GraphQL update arguments of a non state actor to Prisma update data: omitted
 * fields stay untouched, an empty icon clears the icon and the seat amount has to be positive.
 */
export function nonStateActorUpdateData(
	data: NonStateActorUpdateInput
): Prisma.NonStateActorUpdateInput {
	assertSeatsPerDelegationAllowed(data.seatAmount, []);

	return {
		name: data.name ?? undefined,
		abbreviation: data.abbreviation ?? undefined,
		description: data.description ?? undefined,
		seatAmount: data.seatAmount ?? undefined,
		fontAwesomeIcon: data.fontAwesomeIcon === undefined ? undefined : data.fontAwesomeIcon || null
	};
}

interface CommitteeUpdateInput {
	name?: string | null;
	abbreviation?: string | null;
	resolutionHeadline?: string | null;
	numOfSeatsPerDelegation?: number | null;
}

/** Maps the optional GraphQL update arguments of a committee to Prisma update data */
export function committeeUpdateData(data: CommitteeUpdateInput): Prisma.CommitteeUpdateInput {
	return {
		name: data.name ?? undefined,
		abbreviation: data.abbreviation ?? undefined,
		resolutionHeadline: data.resolutionHeadline,
		numOfSeatsPerDelegation: data.numOfSeatsPerDelegation ?? undefined
	};
}

/**
 * A committee can only be deleted while nobody is assigned to it and none of its agenda items has
 * papers, which would otherwise lose their topic. Agenda items without papers are deleted with it.
 */
export function assertCommitteeDeletable(assignedMembers: number, papers: number) {
	if (assignedMembers > 0) {
		throw new GraphQLError(m.committeeDeleteBlocked({ count: assignedMembers }));
	}
	if (papers > 0) {
		throw new GraphQLError(m.committeeDeleteBlockedByPapers({ count: papers }));
	}
}

/** A non-state actor cannot be deleted while a delegation is assigned to it */
export function assertNonStateActorDeletable(assignedDelegations: number) {
	if (assignedDelegations > 0) {
		throw new GraphQLError(m.nonStateActorDeleteBlocked());
	}
}

/** Manual baselines need usable targets; templates ignore them (they are kept for later) */
export function assertRegionalBaselineTargets(baseline: RegionalBaseline, targets: number[]) {
	if (baseline === 'MANUAL' && !isValidManualTargets(targets)) {
		throw new GraphQLError(m.regionalBaselineTargetsInvalid());
	}
	if (targets.length > 0 && targets.length !== regionalGroups.length) {
		throw new GraphQLError(m.regionalBaselineTargetsInvalid());
	}
}
