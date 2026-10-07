/** The parts of a committee that decide how many seats its nations hold. */
type SeatedCommittee<N extends { alpha2Code: string }> = {
	abbreviation: string;
	numOfSeatsPerDelegation: number;
	nations: N[];
};

/**
 * Total seats each nation has across every committee it sits in, with the committees it sits in
 * (most recently listed first).
 */
export function nationSeats<N extends { alpha2Code: string }>(committees: SeatedCommittee<N>[]) {
	const roles: { nation: N; seats: number; committees: string[] }[] = [];
	for (const committee of committees) {
		for (const nation of committee.nations) {
			const entry = roles.find((role) => role.nation.alpha2Code === nation.alpha2Code);
			if (entry) {
				entry.seats += committee.numOfSeatsPerDelegation;
				entry.committees = [committee.abbreviation, ...entry.committees];
			} else {
				roles.push({
					nation,
					seats: committee.numOfSeatsPerDelegation,
					committees: [committee.abbreviation]
				});
			}
		}
	}
	return roles;
}
