import { regionalGroups, type RegionalGroup, type UnMember } from './unMembers';

/**
 * Comparison bases for the regional distribution of a committee's seats. Weights are given per
 * regional group in the order of `regionalGroups`.
 */

export const regionalBaselines = [
	'UN_MEMBERS',
	'HUMAN_RIGHTS_COUNCIL',
	'ECOSOC',
	'SECURITY_COUNCIL',
	'MANUAL'
] as const;

export type RegionalBaseline = (typeof regionalBaselines)[number];

/** Official seat allocations per regional group; the Security Council's includes the P5 */
export const baselineTemplates: Record<Exclude<RegionalBaseline, 'MANUAL'>, number[]> = {
	UN_MEMBERS: [54, 54, 23, 33, 29],
	HUMAN_RIGHTS_COUNCIL: [13, 13, 6, 8, 7],
	ECOSOC: [14, 11, 6, 10, 13],
	SECURITY_COUNCIL: [3, 3, 2, 2, 5]
};

/** Manual targets are usable when there is one non-negative whole number per group, not all 0 */
export function isValidManualTargets(targets: number[]) {
	return (
		targets.length === regionalGroups.length &&
		targets.every((target) => Number.isInteger(target) && target >= 0) &&
		targets.some((target) => target > 0)
	);
}

/** The weights a committee is compared to; unusable manual targets fall back to the UN members */
export function baselineWeights(baseline: RegionalBaseline, manualTargets: number[]) {
	if (baseline !== 'MANUAL') return baselineTemplates[baseline];
	return isValidManualTargets(manualTargets) ? manualTargets : baselineTemplates.UN_MEMBERS;
}

export interface BaselineCommittee {
	id: string;
	numOfSeatsPerDelegation: number;
	/** lowercase alpha-3 codes of the nations holding a seat */
	nations: string[];
	regionalBaseline: RegionalBaseline;
	regionalBaselineTargets: number[];
}

/** Smallest delegation the balancing suggestions may leave behind: one-person delegations don't work */
const MIN_DELEGATION_SIZE = 2;

/** Only existing delegations get another seat, so balancing never creates one-person delegations */
export const canGainSeat = (delegationSize: number) => delegationSize >= MIN_DELEGATION_SIZE - 1;

/** A seat may only be taken where the delegation keeps at least `MIN_DELEGATION_SIZE` seats */
export const canGiveUpSeat = (delegationSize: number, seatsPerDelegation: number) =>
	delegationSize - seatsPerDelegation >= MIN_DELEGATION_SIZE;

export interface GroupDeviation {
	group: RegionalGroup;
	/** seats the group holds in the committee */
	actual: number;
	/** seats the group should hold according to the baseline */
	target: number;
	/** actual - target, in seats; negative means under-represented */
	deviation: number;
}

/**
 * Per committee: how far each regional group's seats are from what the committee's baseline asks
 * for, how many seats would have to move to match it, and which states could take part in the
 * recommended transfer (see `canGainSeat` and `canGiveUpSeat`).
 */
export function regionalDeviations(
	committees: BaselineCommittee[],
	members: UnMember[],
	seatCounts: Map<string, number>
) {
	const groupOf = new Map(members.map((member) => [member.alpha3Code, member.regionalGroup]));

	return committees.map((committee) => {
		const nations = committee.nations.filter((nation) => groupOf.has(nation));
		const seats = nations.length * committee.numOfSeatsPerDelegation;
		const weights = baselineWeights(committee.regionalBaseline, committee.regionalBaselineTargets);
		const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

		const groups: GroupDeviation[] = regionalGroups.map((group, index) => {
			const actual =
				nations.filter((nation) => groupOf.get(nation) === group).length *
				committee.numOfSeatsPerDelegation;
			const target = (weights[index] / weightSum) * seats;
			return { group, actual, target, deviation: actual - target };
		});

		const seatsToMove = balancingSeats(groups, committee.numOfSeatsPerDelegation);
		const mostMissing = groups.reduce((worst, group) =>
			group.deviation < worst.deviation ? group : worst
		);
		const seated = new Set(nations);
		const sizeOf = (nation: string) => seatCounts.get(nation) ?? 0;
		// unseated states of the most missing group, smallest delegations first: they need it most
		const suggestions =
			mostMissing.deviation < 0
				? members
						.filter(
							(member) =>
								member.regionalGroup === mostMissing.group &&
								!seated.has(member.alpha3Code) &&
								canGainSeat(sizeOf(member.alpha3Code))
						)
						.map((member) => member.alpha3Code)
						.sort((a, b) => sizeOf(a) - sizeOf(b))
				: [];

		const recommendation = transferRecommendation(groups, committee.numOfSeatsPerDelegation);
		// the giving group's seated states, largest delegations first: losing a seat hurts them least
		const removals = recommendation
			? nations
					.filter(
						(nation) =>
							groupOf.get(nation) === recommendation.from.group &&
							canGiveUpSeat(sizeOf(nation), committee.numOfSeatsPerDelegation)
					)
					.sort((a, b) => sizeOf(b) - sizeOf(a))
			: [];

		return {
			committeeId: committee.id,
			baseline: committee.regionalBaseline,
			seats,
			groups,
			seatsToMove,
			mostMissing: mostMissing.deviation < 0 ? mostMissing : undefined,
			suggestions,
			recommendation,
			removals
		};
	});
}

/**
 * Distributes `seats` over the groups in proportion to `weights`, as whole seats that add up to
 * `seats` (largest remainder). Without seats the weights themselves are returned, so the result
 * is always usable as manual targets.
 */
export function proportionalTargets(weights: number[], seats: number) {
	if (seats <= 0) return [...weights];
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	const exact = weights.map((weight) => (weight / total) * seats);
	const targets = exact.map(Math.floor);
	const byRemainder = exact
		.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
		.sort((a, b) => b.remainder - a.remainder);
	let missing = seats - targets.reduce((sum, target) => sum + target, 0);
	for (const { index } of byRemainder) {
		if (missing <= 0) break;
		targets[index] += 1;
		missing -= 1;
	}
	return targets;
}

export interface TransferRecommendation {
	from: GroupDeviation;
	to: GroupDeviation;
	/** seats to move, a multiple of the seats per delegation */
	seats: number;
	/** seats the following recommendations would still move */
	seatsToMoveAfter: number;
}

const totalDeviation = (groups: GroupDeviation[]) =>
	groups.reduce((sum, { deviation }) => sum + Math.abs(deviation), 0);

/**
 * A transfer has to bring the committee at least this many seats closer to its baseline. Smaller
 * gains only swap which group is a fraction of a seat off, so such a committee counts as balanced.
 */
const MIN_IMPROVEMENT = 0.5;

/**
 * The single change with the biggest effect: move whole delegations from the most over-represented
 * group to the most under-represented one, as many as bring both closest to their targets (at
 * least one). Only recommended if it brings the committee as a whole noticeably closer to its
 * baseline (`MIN_IMPROVEMENT`).
 */
function bestTransfer(groups: GroupDeviation[], seatsPerDelegation: number) {
	const from = groups.reduce((max, group) => (group.deviation > max.deviation ? group : max));
	const to = groups.reduce((min, group) => (group.deviation < min.deviation ? group : min));
	const delegations = Math.max(
		1,
		Math.floor(Math.min(from.deviation, -to.deviation) / seatsPerDelegation + 0.5)
	);
	const seats = delegations * seatsPerDelegation;
	const after = groups.map((group) => {
		if (group === from) return { ...group, deviation: group.deviation - seats };
		if (group === to) return { ...group, deviation: group.deviation + seats };
		return group;
	});
	if (totalDeviation(groups) - totalDeviation(after) < MIN_IMPROVEMENT) return undefined;
	return { from, to, seats, after };
}

/**
 * Seats that following the recommendations one after another would move until no transfer of
 * whole delegations brings the committee closer to its baseline. 0 means balanced.
 */
export function balancingSeats(groups: GroupDeviation[], seatsPerDelegation: number) {
	let seats = 0;
	let current = groups;
	// every transfer strictly lowers the total deviation; the cap only guards against surprises
	for (let step = 0; step < 100; step++) {
		const transfer = bestTransfer(current, seatsPerDelegation);
		if (!transfer) break;
		seats += transfer.seats;
		current = transfer.after;
	}
	return seats;
}

export function transferRecommendation(
	groups: GroupDeviation[],
	seatsPerDelegation: number
): TransferRecommendation | undefined {
	const transfer = bestTransfer(groups, seatsPerDelegation);
	if (!transfer) return undefined;
	return {
		from: transfer.from,
		to: transfer.to,
		seats: transfer.seats,
		seatsToMoveAfter: balancingSeats(transfer.after, seatsPerDelegation)
	};
}
