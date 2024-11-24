import {
	assignNationToDelegation,
	assignNSAToDelegation,
	getDelegationApplications,
	getNations,
	getNSAs,
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
	const allNSAs = getNSAs();
	const unassignedNSAs = allNSAs.filter((x) => getRemainingSeats(x) >= seatNumber);

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

		// The same for NSAs, their cols are after the nations
		for (const nsa of unassignedNSAs) {
			// Default cost is the nonWishMalus
			let cost = -getWeights().nonWishMalus;

			// If the application has applied for the nation, the cost is the rank of the application
			if (application.appliedForRoles.map((x) => x.nonStateActor?.id).includes(nsa.id)) {
				cost =
					application.appliedForRoles.find((x) => x.nonStateActor?.id === nsa.id)?.rank ||
					-getWeights().nonWishMalus;
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
	console.log(matrix);
	const { assignments } = minWeightAssign(matrix); // This is where the magic happens

	for (let i = 0; i < assignments.length; i++) {
		const assignmentNumber = assignments[i];
		if (assignmentNumber == null) continue;
		const nation =
			assignmentNumber < unassignedNations.length ? unassignedNations[assignmentNumber] : undefined;
		if (nation) {
			const application = unassignedApplicationsWithXSeats[i];
			assignNationToDelegation(application.id, nation.nation.alpha3Code);
			console.info(`Assigning ${application.id} to ${nation.nation.alpha3Code}`);
		} else {
			const nsa = unassignedNSAs[assignmentNumber - unassignedNations.length];
			const application = unassignedApplicationsWithXSeats[i];
			assignNSAToDelegation(application.id, nsa.id);
			console.info(`Assigning ${application.id} to ${nsa.abbreviation}`);
		}
	}
};
