import { m } from '#lib/paraglide/messages';
import { MAX_NAMETAG_BINS } from '#api/handlers/nametagBins/bins';
import { isConferenceLanguage } from '#lib/helpers/conferenceLanguage';
import { z } from 'zod';

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
	nametagBinCount: z
		.number()
		.min(1, { error: () => m.conferenceNametagBinsRange({ max: MAX_NAMETAG_BINS }) })
		.max(MAX_NAMETAG_BINS, { error: () => m.conferenceNametagBinsRange({ max: MAX_NAMETAG_BINS }) })
		.nullish(),
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
