/**
 * What the plausibility checks hold registrations against. The API judges with these and the page
 * shows them, so the rule on screen is the rule that was applied.
 */

/** Participants are at least this old... */
export const PARTICIPANT_MIN_AGE = 13;
/** ...supervisors at least this old, and participants younger than... */
export const SUPERVISOR_MIN_AGE = 21;
/** ...this; from this age on somebody belongs among the supervisors. */
export const PARTICIPANT_MAX_AGE = 26;

/** The share of two accounts' data that has to match before they are shown as a possible duplicate. */
export const DUPLICATE_THRESHOLD = 0.6;

/** January 1st of the year the given age is reached, the cut-off the age checks use. */
export function yearsAgo(years: number) {
	return new Date(new Date().getFullYear() - years, 0, 1);
}
