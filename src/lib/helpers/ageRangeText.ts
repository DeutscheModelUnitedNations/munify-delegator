import { m } from '#lib/paraglide/messages';
import type { AgeIssue, AgeLimits } from './plausibilityRules';

/** The participants' range in words ("von 15 bis 21 Jahren"); undefined when it has no limit. */
export function participantRangeText({
	participantMinAge: min,
	participantMaxAge: max
}: Pick<AgeLimits, 'participantMinAge' | 'participantMaxAge'>) {
	if (min !== null && max !== null) return m.ageRangeBetween({ min, max });
	if (min !== null) return m.ageRangeFrom({ min });
	if (max !== null) return m.ageRangeUpTo({ max });
	return undefined;
}

/** Every limit of a conference in words, for the team; undefined when it has none. */
export function ageLimitsText(limits: AgeLimits) {
	const range = participantRangeText(limits);
	const parts = [
		range && m.ageRangeParticipants({ range }),
		limits.supervisorMinAge !== null && m.ageRangeSupervisors({ min: limits.supervisorMinAge })
	].filter((part) => typeof part === 'string');
	return parts.length ? parts.join(', ') : undefined;
}

/** What the age notice tells someone of `age` with `issue` under these limits; undefined for nothing. */
export function ageNoticeText({
	issue,
	age,
	...limits
}: AgeLimits & { issue: AgeIssue; age: number }) {
	if (issue === 'shouldNotBeSupervisor') {
		return limits.supervisorMinAge === null
			? undefined
			: m.ageNoticeSupervisorRange({ min: limits.supervisorMinAge, age });
	}
	const range = participantRangeText(limits);
	return range && m.ageNoticeParticipantRange({ range, age });
}
