import { m } from '#lib/paraglide/messages';
import type * as schema from '#api/db/schema/index';
import { isValidManualTargets } from '#lib/helpers/seatPlanning/baselines';
import { regionalGroups } from '#lib/helpers/seatPlanning/unMembers';
import { apiError } from '#api/services/errors';
import { z } from 'zod';

/**
 * The rules of a committee's seats and its deletion, free of database access so they are unit
 * tested; the service feeds them what it read.
 */

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

/**
 * Refuses (CONFLICT) a `numOfSeatsPerDelegation` that would leave a delegation with more members
 * assigned to the committee than it has seats there. Left out passes.
 */
export function assertSeatsPerDelegationAllowed({
	numOfSeatsPerDelegation,
	assignedMembers
}: {
	numOfSeatsPerDelegation: number | null | undefined;
	assignedMembers: AssignedMember[];
}) {
	if (numOfSeatsPerDelegation == null) return;
	const min = minSeatsPerDelegation(assignedMembers);
	if (numOfSeatsPerDelegation < min) {
		throw apiError({ code: 'CONFLICT', message: m.seatsPerDelegationBelowAssigned({ min }) });
	}
}

interface CommitteeUpdateInput {
	name?: string | null;
	abbreviation?: string | null;
	resolutionHeadline?: string | null;
	numOfSeatsPerDelegation?: number | null;
}

/**
 * Maps the optional GraphQL update arguments of a committee to update data: left out or null keeps
 * the required fields, while null clears the (nullable) resolution headline.
 */
export function committeeUpdateData(
	data: CommitteeUpdateInput
): Partial<typeof schema.committee.$inferInsert> {
	return {
		name: data.name ?? undefined,
		abbreviation: data.abbreviation ?? undefined,
		resolutionHeadline: data.resolutionHeadline,
		numOfSeatsPerDelegation: data.numOfSeatsPerDelegation ?? undefined
	};
}

/**
 * Refuses (CONFLICT) to delete a committee while somebody is assigned to it or one of its agenda
 * items has papers, which would otherwise lose their topic. Agenda items without papers go with it.
 */
export function assertCommitteeDeletable({
	assignedMembers,
	papers
}: {
	assignedMembers: number;
	papers: number;
}) {
	if (assignedMembers > 0) {
		throw apiError({
			code: 'CONFLICT',
			message: m.committeeDeleteBlocked({ count: assignedMembers })
		});
	}
	if (papers > 0) {
		throw apiError({
			code: 'CONFLICT',
			message: m.committeeDeleteBlockedByPapers({ count: papers })
		});
	}
}

/**
 * Whether a committee may compare against `baseline` with these targets: a manual baseline needs
 * usable ones (`isValidManualTargets`); templates ignore them, so they are kept for later, but
 * they still have to be one per regional group (or none).
 */
export function regionalBaselineTargetsUsable({
	baseline,
	targets
}: {
	baseline: string;
	targets: number[];
}) {
	if (baseline === 'MANUAL' && !isValidManualTargets(targets)) return false;
	return targets.length === 0 || targets.length === regionalGroups.length;
}

/**
 * The arguments of `setCommitteeRegionalBaseline`: given targets have to suit the baseline. Left
 * out targets keep the stored ones, which the service checks (`assertStoredTargetsUsable`).
 */
export const regionalBaselineArgsSchema = z
	.object({ baseline: z.string(), targets: z.array(z.number()).nullish() })
	.refine(
		({ baseline, targets }) => !targets || regionalBaselineTargetsUsable({ baseline, targets }),
		{ error: () => m.regionalBaselineTargetsInvalid() }
	);

/** Refuses (INVALID_INPUT) switching to `baseline` with stored targets that do not suit it. */
export function assertStoredTargetsUsable({
	baseline,
	targets
}: {
	baseline: string;
	targets: number[];
}) {
	if (!regionalBaselineTargetsUsable({ baseline, targets })) {
		throw apiError({ code: 'INVALID_INPUT', message: m.regionalBaselineTargetsInvalid() });
	}
}
