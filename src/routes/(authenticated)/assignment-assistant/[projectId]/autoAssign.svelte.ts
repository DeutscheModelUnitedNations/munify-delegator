import {
	assignNationToDelegation,
	assignNSAToDelegation,
	getDelegationApplications,
	getNations,
	getNSAs,
	getRemainingSeats,
	type ProjectDelegation
} from './appData.svelte';
import { getWeights } from './weights.svelte';
import { minWeightAssign } from 'munkres-algorithm';

/**
 * The cost of giving `application` a role it ranked `wishRank` (undefined when it did not apply
 * for it), adjusted by the weights for flagged and evaluated applications. Lower is better.
 */
function assignmentCost(application: ProjectDelegation, wishRank: number | undefined): number {
	const weights = getWeights();
	// An unwished role costs the nonWishMalus; a wished one costs its rank.
	let cost = wishRank || -weights.nonWishMalus;

	// Apply Flagged Bonus / Malus
	if (application.flagged) {
		cost -= weights.markBonus;
	}

	// Apply Rating Factor Bonus / Malus
	if (application.evaluation) {
		cost += (weights.nullRating - application.evaluation) * weights.ratingFactor;
	}

	return cost;
}

export const autoAssign = (seatNumber: number) => {
	const unassignedApplicationsWithXSeats = getDelegationApplications().filter(
		(x) => !x.assignedNation && !x.assignedNSA && !x.disqualified && x.members.length === seatNumber
	);

	const unassignedNations = getNations().filter((x) => getRemainingSeats(x.nation) >= seatNumber);
	const unassignedNSAs = getNSAs().filter((x) => getRemainingSeats(x) >= seatNumber);

	// --- HUNGARIAN ALGORITHM ---
	// Step 1: Make a matrix of the costs of assigning each delegation to each nation.
	// The NSAs' columns come after the nations'.
	const matrix: number[][] = unassignedApplicationsWithXSeats.map((application) => [
		...unassignedNations.map(({ nation }) =>
			assignmentCost(
				application,
				application.appliedForRoles.find((x) => x.nation?.alpha3Code === nation.alpha3Code)?.rank
			)
		),
		...unassignedNSAs.map((nsa) =>
			assignmentCost(
				application,
				application.appliedForRoles.find((x) => x.nonStateActor?.id === nsa.id)?.rank
			)
		)
	]);
	console.log(matrix);
	const { assignments } = minWeightAssign(matrix); // This is where the magic happens

	assignments.forEach((assignmentNumber, i) => {
		if (assignmentNumber == null) return;
		const application = unassignedApplicationsWithXSeats[i];
		const nation =
			assignmentNumber < unassignedNations.length ? unassignedNations[assignmentNumber] : undefined;
		if (nation) {
			assignNationToDelegation(application.id, nation.nation.alpha3Code);
			console.info(`Assigning ${application.id} to ${nation.nation.alpha3Code}`);
		} else {
			const nsa = unassignedNSAs[assignmentNumber - unassignedNations.length];
			assignNSAToDelegation(application.id, nsa.id);
			console.info(`Assigning ${application.id} to ${nsa.abbreviation}`);
		}
	});
};
