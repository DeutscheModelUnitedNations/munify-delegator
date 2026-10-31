import { m } from '#lib/paraglide/messages';
import { binCountSchema } from '#api/handlers/nametagBins/bins';
import { isConferenceLanguage } from '#lib/helpers/conferenceLanguage';
import { z } from 'zod';
import { conferenceDatesProblem } from '#lib/helpers/conferenceDates';
import { apiError } from '#api/services/errors';

/** The checks of the conference settings, kept apart from the database so they are unit tested. */

/**
 * The settings `updateConference` checks beyond their type; an omitted or cleared one is left to the
 * column.
 */
export const conferenceSettingSchemas = {
	maxSeatsPerSchool: z
		.number()
		.min(1, { error: () => m.conferenceMaxSeatsPerSchoolRange() })
		.nullish(),
	nametagBinCount: binCountSchema.nullish(),
	language: z
		.string()
		.refine(isConferenceLanguage, { error: () => m.conferenceLanguageUnsupported() })
		.nullish(),
	timezone: z
		.string()
		.refine(isKnownTimeZone, { error: () => m.conferenceTimezoneUnknown() })
		.nullish(),
	registrationDeadlineGracePeriodMinutes: z
		.number()
		.int({ error: () => m.conferenceGracePeriodRange() })
		.min(0, { error: () => m.conferenceGracePeriodRange() })
		.nullish(),
	feeAmount: z
		.number()
		.min(0, { error: () => m.conferenceFeeNotNegative() })
		.nullish(),
	currency: z
		.string()
		.length(3, { error: () => m.currencyMustBe3Characters() })
		.nullish()
};

/** Whether the runtime knows the IANA time zone (`Europe/Berlin`), which dates are shown in. */
function isKnownTimeZone(timeZone: string) {
	try {
		new Intl.DateTimeFormat('en', { timeZone });
		return true;
	} catch {
		return false;
	}
}

/** Refuses (INVALID_INPUT) a conference whose dates are out of order (`conferenceDatesProblem`). */
export function assertConferenceDatesInOrder(dates: Parameters<typeof conferenceDatesProblem>[0]) {
	const problem = conferenceDatesProblem(dates);
	if (problem === 'deadlineAfterStart') {
		throw apiError({ code: 'INVALID_INPUT', message: m.conferenceDeadlineAfterStart() });
	}
	if (problem === 'startAfterEnd') {
		throw apiError({ code: 'INVALID_INPUT', message: m.conferenceStartAfterEnd() });
	}
}
