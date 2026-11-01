import { minWeightAssign } from 'munkres-algorithm';
import { occupancy, targetKey, type AssignmentGroup, type Target } from '#lib/assignment/state';
import type { SeatedRole } from '#lib/assignment/capacity';
import {
	assignmentCost,
	reviewCost,
	type AssignmentWeights,
	type GroupReview
} from '#lib/assignment/weights';

/** Upper bound of the tie-break noise, far below any difference between real costs. */
const TIE_BREAK = 1e-6;
/** Stands in for "not allowed" in the matrix; far above any sum of real costs. */
const FORBIDDEN = 1e6;

/**
 * Makes every required row cheaper by more than the whole rest of the matrix can differ, so the
 * matching leaves a required candidate out only when it cannot seat it at all. The bonus is the
 * same across the row, so which role a required candidate gets still follows its costs. Cells at
 * or above `ceiling` (forbidden ones) keep their cost.
 */
function boostRequired({
	matrix,
	required,
	ceiling = Infinity
}: {
	matrix: number[][];
	required: readonly boolean[];
	ceiling?: number;
}) {
	if (!required.some(Boolean)) return matrix;
	const allowed = matrix.flat().filter((cost) => cost < ceiling);
	const bonus =
		(Math.max(...allowed) - Math.min(...allowed) + 1) * Math.min(matrix.length, matrix[0].length);
	return matrix.map((row, index) =>
		required[index] ? row.map((cost) => (cost < ceiling ? cost - bonus : cost)) : row
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

/** The share (0 to 1) of a group's people whose id is in `experiencedIds`. */
export function experienceShare({
	group,
	experiencedIds
}: {
	group: AssignmentGroup;
	experiencedIds: ReadonlySet<string>;
}) {
	if (group.singleParticipantId) return experiencedIds.has(group.singleParticipantId) ? 1 : 0;
	if (group.memberIds.length === 0) return 0;
	return group.memberIds.filter((id) => experiencedIds.has(id)).length / group.memberIds.length;
}

/**
 * Matches the unassigned groups of one size to the roles with exactly that many free seats in one
 * pass, at the lowest total cost (the Hungarian method). Filling a role exactly is the point: a
 * role a group only partly fills would need a second delegation merged in, which is better decided
 * by hand.
 *
 * A role a group did not wish for is allowed, but costs more than any combination of wished roles
 * could save, so wishes always win: the matching seats as many groups as possible on a wish, then
 * minimises the cost among those, and only what is left over goes to groups without a seatable
 * wish (best-rated first when there are more groups than roles). A required group is seated
 * whenever a role fits it, before every group that is not (`boostRequired`). Equal costs are
 * broken by a seeded hash, not by input order.
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
	const seed = input.seed ?? '';

	const costs = candidates.map((group) =>
		roles.map((role) => {
			const wishRank = input.wishRankOf(group, role.target);
			const review = input.reviewOf(group);
			const experience = input.experienceOf?.(group) ?? 0;
			return {
				wished: wishRank !== undefined,
				cost:
					(wishRank === undefined
						? reviewCost({ weights: input.weights, review, experience })
						: assignmentCost({ weights: input.weights, review, wishRank, experience })) +
					hash01(`${seed}|${group.key}|${role.key}`) * TIE_BREAK
			};
		})
	);
	// One more unwished seat must outweigh whatever the other seats could save between them.
	const all = costs.flat().map(({ cost }) => cost);
	const span = Math.max(...all) - Math.min(...all);
	const unwishedPenalty = (span + 1) * Math.min(candidates.length, roles.length);
	const matrix = boostRequired({
		matrix: costs.map((row) =>
			row.map(({ wished, cost }) => (wished ? cost : cost + unwishedPenalty))
		),
		required: candidates.map((group) => !!input.reviewOf(group)?.required)
	});

	const { assignments } = minWeightAssign(matrix);
	return assignments.flatMap((column, row) =>
		column == null ? [] : [{ group: candidates[row], target: roles[column].target }]
	);
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

	const matrix = boostRequired({
		matrix: candidates.map((candidate) =>
			slots.map((slot) =>
				candidate.wishedRoleIds.has(slot.roleId)
					? reviewCost({
							weights: input.weights,
							review: candidate.review,
							experience: candidate.experience
						}) +
						hash01(`${seed}|${candidate.id}|${slot.roleId}|${slot.index}`) * TIE_BREAK
					: FORBIDDEN
			)
		),
		required: candidates.map((candidate) => !!candidate.review?.required),
		ceiling: FORBIDDEN
	});
	const { assignments } = minWeightAssign(matrix);
	return assignments.flatMap((column, row) =>
		column == null || matrix[row][column] >= FORBIDDEN
			? []
			: [{ singleParticipantId: candidates[row].id, roleId: slots[column].roleId }]
	);
}
