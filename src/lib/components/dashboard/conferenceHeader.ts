import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';

const longDate: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

const formatDate = (date: Date) => new Date(date).toLocaleDateString(getLocale(), longDate);

/** A conference's dates; within one month the first date is only its day ("3. – 5. May 2026"). */
export function formatDateRange({
	start,
	end
}: {
	start: Date | null | undefined;
	end: Date | null | undefined;
}) {
	if (!start || !end) return '';
	const startD = new Date(start);
	const endD = new Date(end);
	const sameMonth =
		startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear();
	if (sameMonth) return `${startD.getDate()}. – ${formatDate(end)}`;
	return `${formatDate(start)} – ${formatDate(end)}`;
}

const stateLabels: Record<ConferencestateEnum, () => string> = {
	PRE: m.conferenceStatusPre,
	PARTICIPANT_REGISTRATION: m.conferenceStatusParticipantRegistration,
	PREPARATION: m.conferenceStatusPreparation,
	ACTIVE: m.conferenceStatusActive,
	POST: m.conferenceStatusPost
};

const stateColors: Record<ConferencestateEnum, string> = {
	PRE: 'badge-neutral',
	PARTICIPANT_REGISTRATION: 'badge-info',
	PREPARATION: 'badge-warning',
	ACTIVE: 'badge-success',
	POST: 'badge-neutral'
};

/** The state's label; a state the client does not know yet shows as it is. */
export const translateState = (state: ConferencestateEnum) => stateLabels[state]?.() ?? state;

export const getStateColor = (state: ConferencestateEnum) => stateColors[state] ?? 'badge-ghost';
