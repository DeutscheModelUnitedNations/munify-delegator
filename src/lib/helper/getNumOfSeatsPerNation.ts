export default function getNumOfSeatsPerNation(nation: any, committees: any[]) {
	let numOfSeats = 0;
	committees.forEach((committee: any) => {
		if (committee.nations.find((c: any) => c.alpha3Code === nation.alpha3Code))
			numOfSeats += committee.numOfSeatsPerDelegation;
	});
	return numOfSeats;
}
