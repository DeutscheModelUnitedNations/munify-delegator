/**
 * What the plausibility checks hold registrations against. The ages are the conference's
 * (`conference.participantMinAge` …), measured on its first day; the API judges with these rules,
 * the plausibility page shows them and the entry flows warn with them, so all three agree.
 */

/** A conference's age range; an empty limit switches its check off. */
export type AgeLimits = {
	/** Participants are at least this old... */
	participantMinAge: number | null;
	/** ...and at most this old. */
	participantMaxAge: number | null;
	/** Supervisors are at least this old. */
	supervisorMinAge: number | null;
};

/** The limits a new conference starts with, the column defaults. */
export const DEFAULT_AGE_LIMITS = {
	participantMinAge: 15,
	participantMaxAge: 21,
	supervisorMinAge: 21
} satisfies AgeLimits;

/**
 * - `tooYoung`: a participant younger than `participantMinAge`
 * - `shouldBeSupervisor`: a participant older than `participantMaxAge` and old enough to supervise
 * - `tooOld`: a participant older than `participantMaxAge`, yet too young to supervise
 * - `shouldNotBeSupervisor`: a supervisor younger than `supervisorMinAge`
 */
export type AgeIssue = 'tooYoung' | 'tooOld' | 'shouldBeSupervisor' | 'shouldNotBeSupervisor';

export type AgeRole = 'participant' | 'supervisor';

/** What, if anything, is off about someone of `age` taking part as `role` under `limits`. */
export function ageIssue({
	age,
	role,
	limits
}: {
	age: number;
	role: AgeRole;
	limits: AgeLimits;
}): AgeIssue | undefined {
	const { participantMinAge, participantMaxAge, supervisorMinAge } = limits;
	if (role === 'supervisor') {
		return supervisorMinAge !== null && age < supervisorMinAge
			? 'shouldNotBeSupervisor'
			: undefined;
	}
	if (participantMinAge !== null && age < participantMinAge) return 'tooYoung';
	if (participantMaxAge === null || age <= participantMaxAge) return undefined;
	return supervisorMinAge !== null && age < supervisorMinAge ? 'tooOld' : 'shouldBeSupervisor';
}

/** An age range in years: at least `gte`, below `lt`; a missing end is open. */
export type AgeBand = { gte?: number; lt?: number };

/**
 * The ages each issue covers under `limits`, for finding everyone with it at once (the
 * plausibility page) and for naming the rule; an issue the limits switch off or rule out is
 * missing. Agrees with `ageIssue` for every age.
 */
export function ageBands(limits: AgeLimits): Partial<Record<AgeIssue, AgeBand>> {
	const { participantMinAge: min, participantMaxAge: max, supervisorMinAge: supervisor } = limits;
	const bands: Partial<Record<AgeIssue, AgeBand>> = {};
	if (min !== null) bands.tooYoung = { lt: min };
	if (max !== null) {
		if (supervisor !== null && supervisor > max + 1) {
			bands.tooOld = { gte: max + 1, lt: supervisor };
		}
		bands.shouldBeSupervisor = { gte: Math.max(max + 1, supervisor ?? 0) };
	}
	if (supervisor !== null) bands.shouldNotBeSupervisor = { lt: supervisor };
	return bands;
}

/** The share of two accounts' data that has to match before they are shown as a possible duplicate. */
export const DUPLICATE_THRESHOLD = 0.6;
