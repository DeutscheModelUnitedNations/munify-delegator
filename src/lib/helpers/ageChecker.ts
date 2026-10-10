import dayjs from 'dayjs';

export function getAgeAtConference(birthday: Date | string, startConference: Date | string) {
	const start = dayjs(startConference);
	const birth = dayjs(birthday);

	if (!start.isValid() || !birth.isValid()) {
		return undefined;
	}

	// Compute age in full years by comparing year/month/day
	let years = start.year() - birth.year();
	if (
		start.month() < birth.month() ||
		(start.month() === birth.month() && start.date() < birth.date())
	) {
		years -= 1;
	}

	return years;
}

export function ofAgeAtConference(
	startConference: Date | string | undefined | null,
	dateOfBirth: Date | string | undefined | null
): boolean {
	if (!startConference || !dateOfBirth) {
		return false;
	}

	const ageAtConference = getAgeAtConference(dateOfBirth, startConference);
	return ageAtConference ? ageAtConference >= 18 : false;
}

/**
 * The birthdays of people whose age on `startConference` lies within the range, as bounds for a
 * date filter: at least `gte` years old means born on or before that many years earlier, at most
 * `lte` means born after the day `lte + 1` years earlier.
 */
export function birthdayBoundsForAge(
	range: { gte?: number; lte?: number },
	startConference: Date | string
): { lte?: Date; gt?: Date } {
	const start = dayjs(startConference);
	return {
		...(range.gte === undefined ? {} : { lte: start.subtract(range.gte, 'year').toDate() }),
		...(range.lte === undefined ? {} : { gt: start.subtract(range.lte + 1, 'year').toDate() })
	};
}
