import {
	assignNationToDelegation,
	getDelegationApplications,
	getNations,
	getRemainingSeats
} from './appData.svelte';
import { getWeights } from './weights.svelte';
import { minWeightAssign } from 'munkres-algorithm';

export const autoAssign = (seatNumber: number) => {
	const allApplications = getDelegationApplications();
	const unassignedApplications = allApplications.filter(
		(x) => !x.assignedNation && !x.assignedNSA && !x.disqualified
	);

	const unassignedApplicationsWithXSeats = unassignedApplications.filter(
		(x) => x.members.length === seatNumber
	);

	const allNations = getNations();
	const unassignedNations = allNations.filter((x) => getRemainingSeats(x.nation) >= seatNumber);

	// --- HUNGARIAN ALGORITHM ---
	// Step 1: Make a matrix of the costs of assigning each delegation to each nation
	let matrix: number[][] = [];
	for (const application of unassignedApplicationsWithXSeats) {
		const row: number[] = [];
		for (const nation of unassignedNations) {
			// Default cost is the nonWishMalus
			let cost = -getWeights().nonWishMalus;

			// If the application has applied for the nation, the cost is the rank of the application
			if (
				application.appliedForRoles
					.map((x) => x.nation?.alpha3Code)
					.includes(nation.nation.alpha3Code)
			) {
				cost =
					application.appliedForRoles.find((x) => x.nation?.alpha3Code === nation.nation.alpha3Code)
						?.rank || -getWeights().nonWishMalus;
			}

			// Apply Flagged Bonus / Malus
			if (application.flagged) {
				cost -= getWeights().markBonus;
			}

			// Apply Rating Factor Bonus / Malus
			if (application.evaluation) {
				cost += (getWeights().nullRating - application.evaluation) * getWeights().ratingFactor;
			}

			row.push(cost);
		}

		matrix.push(row);
	}
	const { assignments } = minWeightAssign(matrix);

	console.log(matrix);
	console.log(assignments);

	for (let i = 0; i < assignments.length; i++) {
		const assignmentNumber = assignments[i];
		if (assignmentNumber == null) continue;
		const nation = unassignedNations[assignmentNumber];
		const application = unassignedApplicationsWithXSeats[i];
		assignNationToDelegation(application.id, nation.nation.alpha3Code);
		console.log(`Assigning ${application.id} to ${nation.nation.alpha3Code}`);
	}

	alert('Auto-assign completed');
};
