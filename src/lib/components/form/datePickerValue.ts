/**
 * The date the non-native picker reports: its picked day, and with `enableTime` the picked
 * `HH:MM[:SS[:MS]]` wall-clock time on that day (missing parts are 0).
 */
export function pickedDate(
	startDate: string | number | Date,
	startDateTime: string,
	enableTime: boolean
): Date {
	const date = new Date(startDate);
	if (enableTime) {
		const [hours = 0, minutes = 0, seconds = 0, ms = 0] = startDateTime.split(':').map(Number);
		date.setHours(hours, minutes, seconds, ms);
	}
	return date;
}
