import { minWeightAssign } from 'munkres-algorithm';
import { occupancy, targetKey, type AssignmentGroup, type Target } from './state';
import type { SeatedRole } from './capacity';

export interface AssignmentWeights {
	/** The rating that counts as neutral; unrated applications are treated as having it. */
	nullRating: number;
	/** How strongly each star above or below the neutral rating moves the cost. */
	ratingFactor: number;
	/** What a flag takes off the cost. */
	markBonus: number;
	/** What a role the application did not wish for costs. */
	nonWishMalus: number;
}

export const DEFAULT_WEIGHTS: AssignmentWeights = {
	nullRating: 2.5,
	ratingFactor: 1,
	markBonus: 0,
	nonWishMalus: 50
};

export interface GroupReview {
	evaluation: number | null;
	flagged: boolean;
	disqualified: boolean;
}

/**
 * The cost of giving a group a role it ranked `wishRank` (undefined when it did not wish for it),
 * moved by its rating and flag. Lower is better.
 */
export function assignmentCost(
	weights: AssignmentWeights,
	review: GroupReview | undefined,
	wishRank: number | undefined
) {
	let cost = wishRank ?? weights.nonWishMalus;
	if (review?.flagged) cost -= weights.markBonus;
	if (review?.evaluation != null) {
		cost += (weights.nullRating - review.evaluation) * weights.ratingFactor;
	}
	return cost;
}

export interface AutoAssignInput {
	/** Groups of exactly the size being assigned. */
	size: number;
	groups: readonly AssignmentGroup[];
	roles: readonly SeatedRole[];
	weights: AssignmentWeights;
	/** The review of the application a group comes from. */
	reviewOf: (group: AssignmentGroup) => GroupReview | undefined;
	/** The rank the group's application gave a role, if it wished for it. */
	wishRankOf: (group: AssignmentGroup, target: Target) => number | undefined;
}

/**
 * Matches the unassigned groups of one size to the roles with exactly that many free seats, at the
 * lowest total cost (the Hungarian method). Filling a role exactly is the point: a role a group
 * only partly fills would need a second delegation merged in, which is better decided by hand.
 */
export function autoAssign(input: AutoAssignInput) {
	const taken = occupancy(input.groups);
	const candidates = input.groups.filter(
		(group) =>
			group.size === input.size && !targetKey(group.target) && !input.reviewOf(group)?.disqualified
	);
	const roles = input.roles.filter(
		(role) => role.seats - (taken.get(role.key) ?? 0) === input.size
	);
	if (candidates.length === 0 || roles.length === 0) return [];

	const matrix = candidates.map((group) =>
		roles.map((role) =>
			assignmentCost(input.weights, input.reviewOf(group), input.wishRankOf(group, role.target))
		)
	);
	const { assignments } = minWeightAssign(matrix);

	return assignments.flatMap((column, row) =>
		column == null ? [] : [{ group: candidates[row], target: roles[column].target }]
	);
}
