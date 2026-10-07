import { minWeightAssign } from 'munkres-algorithm';
import { occupancy, targetKey, type AssignmentGroup, type Target } from './state';
import type { SeatedRole } from './capacity';

/**
 * How a modifier (flags, experience) acts. `WISHES_AND_SEATING` shifts who is left out and also
 * how strongly the group's wishes weigh in contested roles (as a rating does); `SEATING_ONLY` only
 * shifts who is left out.
 */
export const WISH_EFFECTS = ['WISHES_AND_SEATING', 'SEATING_ONLY'] as const;
export type WishEffect = (typeof WISH_EFFECTS)[number];

export interface AssignmentWeights {
	/** The rating that counts as neutral; unrated applications are treated as having it. */
	nullRating: number;
	/** How strongly each star above or below the neutral rating moves the cost. */
	ratingFactor: number;
	/** What a flag takes off the cost. */
	markBonus: number;
	/** Whether a flag also scales the weight of the group's wishes. */
	markEffect: WishEffect;
	/**
	 * What a group costs extra if everybody in it has been seated at an earlier conference, scaled
	 * by the share of members who have. Positive punishes experience, negative rewards it.
	 */
	experienceModifier: number;
	experienceEffect: WishEffect;
}

export const DEFAULT_WEIGHTS: AssignmentWeights = {
	nullRating: 2.5,
	ratingFactor: 1,
	markBonus: 0,
	markEffect: 'SEATING_ONLY',
	experienceModifier: 0,
	experienceEffect: 'WISHES_AND_SEATING'
};

export interface GroupReview {
	evaluation: number | null;
	flagged: boolean;
	disqualified: boolean;
}

/**
 * How much one rating point above or below neutral (times `ratingFactor`) scales a group's wish
 * cost. Costs are summed, so a group whose wishes count for more wins the contested roles.
 */
const RATING_PRIORITY = 0.1;
/** A group's wish cost never scales below this, however high its rating. */
const MIN_PRIORITY = 0.25;
/** Stands in for "not allowed" in the matrix; far above any sum of real costs. */
const FORBIDDEN = 1e6;
/** Upper bound of the tie-break noise, far below any difference between real costs. */
const TIE_BREAK = 1e-6;

/**
 * What a group's review adds to every role it could get: a flag and a good rating make it cheaper
 * to seat at all, which decides who is left out when there are more groups than roles.
 */
function reviewCost(
	weights: AssignmentWeights,
	review: GroupReview | undefined,
	experience: number
) {
	let cost = weights.experienceModifier * experience;
	if (review?.flagged) cost -= weights.markBonus;
	if (review?.evaluation != null) {
		cost += (weights.nullRating - review.evaluation) * weights.ratingFactor;
	}
	return cost;
}

/**
 * The cost of giving a group a role it ranked `wishRank`. Lower is better. The rank is squared, so
 * one group's far-down pick costs more than several groups' second picks (the total stays fair,
 * not just small). A good rating makes the group's wishes weigh more, so it wins contested roles.
 * `experience` is the share (0 to 1) of the group's members seated at an earlier conference.
 */
export function assignmentCost(
	weights: AssignmentWeights,
	review: GroupReview | undefined,
	wishRank: number,
	experience = 0
) {
	const rating = review?.evaluation;
	let priority =
		rating == null ? 1 : 1 + (rating - weights.nullRating) * weights.ratingFactor * RATING_PRIORITY;
	if (review?.flagged && weights.markEffect === 'WISHES_AND_SEATING') {
		priority += weights.markBonus * RATING_PRIORITY;
	}
	if (weights.experienceEffect === 'WISHES_AND_SEATING') {
		priority -= weights.experienceModifier * experience * RATING_PRIORITY;
	}
	return (
		wishRank * wishRank * Math.max(MIN_PRIORITY, priority) + reviewCost(weights, review, experience)
	);
}

/** A stable pseudo-random number in [0, 1) for a string (FNV-1a), to break ties without bias. */
function hash01(text: string) {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0) / 2 ** 32;
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
	/** The share (0 to 1) of the group's members seated at an earlier conference; none by default. */
	experienceOf?: (group: AssignmentGroup) => number;
	/** Varies how ties between equally good matchings are broken; same seed, same result. */
	seed?: string;
}

/**
 * Matches the unassigned groups of one size to the roles with exactly that many free seats, at the
 * lowest total cost (the Hungarian method). Filling a role exactly is the point: a role a group
 * only partly fills would need a second delegation merged in, which is better decided by hand.
 *
 * Two rounds, so wishes always win. The first seats as many groups as possible on a role they
 * wished for, then minimises the cost. The second hands the roles still free to the groups still
 * without one (those with no wishes, or whose wishes were all taken), best-rated first when there
 * are more groups than roles. Equal costs are broken by a seeded hash, not by input order.
 */
export function autoAssign(input: AutoAssignInput) {
	const taken = occupancy(input.groups);
	let candidates = input.groups.filter(
		(group) =>
			group.size === input.size && !targetKey(group.target) && !input.reviewOf(group)?.disqualified
	);
	let roles = input.roles.filter((role) => role.seats - (taken.get(role.key) ?? 0) === input.size);
	const seed = input.seed ?? '';

	const solve = (wishedOnly: boolean) => {
		if (candidates.length === 0 || roles.length === 0) return [];
		const matrix = candidates.map((group) =>
			roles.map((role) => {
				const wishRank = input.wishRankOf(group, role.target);
				if (wishedOnly && wishRank === undefined) return FORBIDDEN;
				const review = input.reviewOf(group);
				const experience = input.experienceOf?.(group) ?? 0;
				const cost =
					wishRank === undefined
						? reviewCost(input.weights, review, experience)
						: assignmentCost(input.weights, review, wishRank, experience);
				return cost + hash01(`${seed}|${group.key}|${role.key}`) * TIE_BREAK;
			})
		);
		const { assignments } = minWeightAssign(matrix);
		const matches = assignments.flatMap((column, row) =>
			column == null || matrix[row][column] >= FORBIDDEN
				? []
				: [{ group: candidates[row], target: roles[column].target }]
		);
		const groupsDone = new Set(matches.map(({ group }) => group));
		const rolesDone = new Set(matches.map(({ target }) => targetKey(target)));
		candidates = candidates.filter((group) => !groupsDone.has(group));
		roles = roles.filter((role) => !rolesDone.has(role.key));
		return matches;
	};

	return [...solve(true), ...solve(false)];
}

export interface SingleCandidate {
	id: string;
	/** The custom roles the applicant applied for; they are never given any other. */
	wishedRoleIds: ReadonlySet<string>;
	review: GroupReview | undefined;
	/** 1 if the applicant was seated at an earlier conference, else 0. */
	experience: number;
}

export interface AutoAssignSinglesInput {
	/** The applicants without a role yet. */
	candidates: readonly SingleCandidate[];
	/** The custom roles that still have room. */
	roles: readonly { id: string; freeSeats: number }[];
	weights: AssignmentWeights;
	seed?: string;
}

/**
 * Seats single participants on the custom roles they applied for, at the lowest total cost. Wishes
 * are unranked, so they only decide who may get which role; who is left out when a role is
 * oversubscribed follows from rating, flag and experience (`reviewCost`). Each role is expanded
 * into one column per free seat, and an applicant whose wishes are all full stays unassigned.
 */
export function autoAssignSingles(input: AutoAssignSinglesInput) {
	const candidates = input.candidates.filter(
		(candidate) => !candidate.review?.disqualified && candidate.wishedRoleIds.size > 0
	);
	const slots = input.roles.flatMap((role) =>
		Array.from({ length: Math.max(0, role.freeSeats) }, (_, index) => ({ roleId: role.id, index }))
	);
	if (candidates.length === 0 || slots.length === 0) return [];
	const seed = input.seed ?? '';

	const matrix = candidates.map((candidate) =>
		slots.map((slot) =>
			candidate.wishedRoleIds.has(slot.roleId)
				? reviewCost(input.weights, candidate.review, candidate.experience) +
					hash01(`${seed}|${candidate.id}|${slot.roleId}|${slot.index}`) * TIE_BREAK
				: FORBIDDEN
		)
	);
	const { assignments } = minWeightAssign(matrix);
	return assignments.flatMap((column, row) =>
		column == null || matrix[row][column] >= FORBIDDEN
			? []
			: [{ singleParticipantId: candidates[row].id, roleId: slots[column].roleId }]
	);
}
