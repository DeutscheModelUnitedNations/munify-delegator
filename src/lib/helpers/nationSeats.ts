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
	const roles = new Map<string, { nation: N; seats: number; committees: string[] }>();
	for (const committee of committees) {
		for (const nation of committee.nations) {
			const entry = roles.get(nation.alpha2Code);
			if (entry) {
				entry.seats += committee.numOfSeatsPerDelegation;
				entry.committees.unshift(committee.abbreviation);
			} else {
				roles.set(nation.alpha2Code, {
					nation,
					seats: committee.numOfSeatsPerDelegation,
					committees: [committee.abbreviation]
				});
			}
		}
	}
	return [...roles.values()];
}
