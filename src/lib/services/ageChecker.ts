export function ofAgeAtConference(
	conferenceStart: Date | string | undefined | null,
	dateOfBirth: Date | string | undefined | null
): boolean {
	if (!conferenceStart || !dateOfBirth) {
		return false;
	}
	const start = new Date(conferenceStart);
	const birth = new Date(dateOfBirth);
	return (start.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25) >= 18;
}
