/**
 * The assignment's weights and what they make a seat cost: shared by the weights form and the
 * matching (`#api/handlers/assignment/autoAssign`).
 */

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
	/** Has to end up with a seat: seated before anyone else whenever a fitting role is free. */
	required?: boolean;
}

/**
 * How much one rating point above or below neutral (times `ratingFactor`) scales a group's wish
 * cost. Costs are summed, so a group whose wishes count for more wins the contested roles.
 */
const RATING_PRIORITY = 0.1;
/** A group's wish cost never scales below this, however high its rating. */
const MIN_PRIORITY = 0.25;

/**
 * What a group's review adds to every role it could get: a flag and a good rating make it cheaper
 * to seat at all, which decides who is left out when there are more groups than roles.
 */
export function reviewCost({
	weights,
	review,
	experience
}: {
	weights: AssignmentWeights;
	review: GroupReview | undefined;
	experience: number;
}) {
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
export function assignmentCost({
	weights,
	review,
	wishRank,
	experience = 0
}: {
	weights: AssignmentWeights;
	review: GroupReview | undefined;
	wishRank: number;
	experience?: number;
}) {
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
		wishRank * wishRank * Math.max(MIN_PRIORITY, priority) +
		reviewCost({ weights, review, experience })
	);
}
