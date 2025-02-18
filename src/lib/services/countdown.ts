import * as m from '$lib/paraglide/messages';

/**
 * Computes the countdown timer until a specified target date.
 *
 * This function calculates the remaining time between the current date and the provided target date.
 * If the target date is in the past, it returns undefined. Otherwise, it formats the time left
 * in days along with hours, minutes, and seconds.
 *
 * @param targetDate - The future date for which the countdown is calculated.
 * @param currentTime - An optional current time to make the timer calculation reactive.
 * @returns A string representing the time left in the format "D days, HH:MM:SS" or undefined if the target date has already passed.
 */
export function countdownTimer(targetDate: Date, currentTime?: Date) {
	const now = currentTime || new Date();
	const timeLeft = targetDate.getTime() - now.getTime();

	if (timeLeft < 0) return undefined;

	const seconds = Math.floor((timeLeft / 1000) % 60);
	const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
	const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
	const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

	return `${days} ${m.days()}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
