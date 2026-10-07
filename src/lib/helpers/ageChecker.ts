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
