export type WaitingListStatus = 'VACANCIES' | 'SHORT_LIST' | 'LONG_LIST';

export const getWaitingListStatus = (
	seats: number,
	participants: number,
	listEntries: number
): WaitingListStatus => {
	const freeSeats = Math.max(seats - participants, 0);

	// If there are more seats then participants plus waiting list entries (minus a value accounting for people on the list who are not going to take their place)
	if (seats > participants + Math.max(listEntries - 5, 0)) {
		return 'VACANCIES';
	}

	// If the waiting list (minus any free seats) is longer then a value, the waiting list is considered long
	if (listEntries - freeSeats > 20) {
		return 'LONG_LIST';
	}

	return 'SHORT_LIST';
};
