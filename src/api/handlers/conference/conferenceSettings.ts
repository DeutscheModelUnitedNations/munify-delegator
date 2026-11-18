import { m } from '#lib/paraglide/messages';
import { binCountSchema } from '#api/handlers/nametagBins/bins';
import { isConferenceLanguage } from '#lib/helpers/conferenceLanguage';
import { z } from 'zod';
import { conferenceDatesProblem } from '#lib/helpers/conferenceDates';
import { apiError } from '#api/services/errors';
import { LAYOUT_DOCUMENTS, documentLayoutSchema } from '#lib/helpers/documentLayout';
import type { AgeLimits } from '#lib/helpers/plausibilityRules';
import { ageLimitSchema } from '#lib/schemata/ageLimit';

/** The checks of the conference settings, kept apart from the database so they are unit tested. */

/**
 * The settings `updateConference` checks beyond their type; an omitted or cleared one is left to the
 * column.
 */
export const conferenceSettingSchemas = {
	maxCollectiveGroupSize: z
		.number()
		.min(1, { error: () => m.conferenceMaxCollectiveGroupSizeRange() })
		.nullish(),
	maxGuaranteedSeatsPerForeignSchool: z
		.number()
		.min(0, { error: () => m.conferenceMaxGuaranteedSeatsRange() })
		.nullish(),
	maxForeignGuaranteedSeatsPercent: z
		.number()
		.min(0, { error: () => m.conferenceMaxForeignGuaranteedSeatsPercentRange() })
		.max(100, { error: () => m.conferenceMaxForeignGuaranteedSeatsPercentRange() })
		.nullish(),
	nametagBinCount: binCountSchema.nullish(),
	participantMinAge: ageLimitSchema(),
	participantMaxAge: ageLimitSchema(),
	supervisorMinAge: ageLimitSchema(),
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

/** Refuses (INVALID_INPUT) a range whose lower limit lies above its upper one. */
export function assertAgeRangeInOrder({
	participantMinAge,
	participantMaxAge
}: Pick<AgeLimits, 'participantMinAge' | 'participantMaxAge'>) {
	if (participantMinAge !== null && participantMaxAge !== null) {
		if (participantMinAge > participantMaxAge) {
			throw apiError({ code: 'INVALID_INPUT', message: m.conferenceAgeRangeOutOfOrder() });
		}
	}
}

/** The arguments of `setDocumentLayout`: a layout has to fit its document; null clears it. */
export const documentLayoutArgsSchema = z
	.object({
		conferenceId: z.string(),
		document: z.enum(LAYOUT_DOCUMENTS),
		layout: z.unknown()
	})
	.transform((args, ctx) => {
		if (args.layout === null || args.layout === undefined) return { ...args, layout: null };
		const parsed = documentLayoutSchema(args.document).safeParse(args.layout);
		if (parsed.success) return { ...args, layout: parsed.data };
		ctx.issues.push({ code: 'custom', input: args.layout, message: m.documentLayoutInvalid() });
		return z.NEVER;
	});

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
