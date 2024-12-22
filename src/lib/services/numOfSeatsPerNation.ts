import type { Committee, Nation } from '@prisma/client';

export default function getNumOfSeatsPerNation(
	nation: Pick<Nation, 'alpha3Code'>,
	committees: (Pick<Committee, 'numOfSeatsPerDelegation'> & {
		nations: Pick<Nation, 'alpha3Code'>[];
	})[]
) {
	let numOfSeats = 0;
	committees.forEach((committee) => {
		if (committee.nations.find((c) => c.alpha3Code === nation.alpha3Code))
			numOfSeats += committee.numOfSeatsPerDelegation;
	});
	return numOfSeats;
}
