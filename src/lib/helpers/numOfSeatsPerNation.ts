import type * as schema from '$api/db/schema';

export default function getNumOfSeatsPerNation(
	nation: Pick<typeof schema.nation.$inferSelect, 'alpha3Code'>,
	committees: (Pick<typeof schema.committee.$inferSelect, 'numOfSeatsPerDelegation'> & {
		nations: Pick<typeof schema.nation.$inferSelect, 'alpha3Code'>[];
	})[]
) {
	let numOfSeats = 0;
	committees.forEach((committee) => {
		if (committee.nations.find((c) => c.alpha3Code === nation.alpha3Code))
			numOfSeats += committee.numOfSeatsPerDelegation;
	});
	return numOfSeats;
}
