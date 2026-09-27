import type { Row } from '$api/db/rows';

export default function getNumOfSeatsPerNation(
	nation: Pick<Row<'nation'>, 'alpha3Code'>,
	committees: (Pick<Row<'committee'>, 'numOfSeatsPerDelegation'> & {
		nations: Pick<Row<'nation'>, 'alpha3Code'>[];
	})[]
) {
	let numOfSeats = 0;
	committees.forEach((committee) => {
		if (committee.nations.find((c) => c.alpha3Code === nation.alpha3Code))
			numOfSeats += committee.numOfSeatsPerDelegation;
	});
	return numOfSeats;
}
