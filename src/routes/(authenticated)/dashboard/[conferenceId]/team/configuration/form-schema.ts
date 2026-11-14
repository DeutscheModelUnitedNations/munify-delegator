import { isConferenceLanguage } from '#lib/helpers/conferenceLanguage';
import valiator from 'validator';
import IBAN from 'iban';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { conferenceDatesProblem } from '#lib/helpers/conferenceDates';
import { ageLimitSchema } from '#lib/schemata/ageLimit';

export const conferenceSettingsFormSchema = z
	.object({
		title: z.string().min(3, {
			message: m.atLeastXChars({ amount: 3 })
		}),
		linkToPreparationGuide: z.string().nullish(),
		linkToTeamWiki: z.string().nullish(),
		linkToServicesPage: z.string().nullish(),
		isOpenPaperSubmission: z.boolean().default(false),
		showCalendar: z.boolean().default(false),
		messagingEnabled: z.boolean().default(false),
		timezone: z.string().min(1).default('Europe/Berlin'),
		longTitle: z
			.string()
			.min(5, {
				message: m.atLeastXChars({ amount: 5 })
			})
			.optional(),
		location: z
			.string()
			.min(3, {
				message: m.atLeastXChars({ amount: 3 })
			})
			.optional(),
		language: z.string().refine(isConferenceLanguage),
		website: z
			.string()
			.refine((s) => valiator.isURL(s, { protocols: ['http', 'https'] }), {
				message: m.pleaseEnterAValidWebsite()
			})
			.optional(),
		/** The images: a picked `File` replaces the stored one, `null` removes it. */
		image: z
			.instanceof(File)
			.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
			.nullish(),
		emblem: z
			.instanceof(File)
			.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
			.nullish(),
		logo: z
			.instanceof(File)
			.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
			.nullish(),
		applicationDeadline: z.date({
			message: m.pleaseEnterAValidDate()
		}),
		registrationDeadlineGracePeriodMinutes: z.coerce.number(),
		/** Up to how many students of one supervisor and school are decided on together; empty for none. */
		maxCollectiveGroupSize: z.number().int().min(1).nullish(),
		/** Guaranteed seats per Auslandsschule before the assignment warns; empty for no limit. */
		maxGuaranteedSeatsPerForeignSchool: z.number().int().min(0).nullish(),
		/** Which share of all seats the Auslandsschulen together may be guaranteed; empty for no limit. */
		maxForeignGuaranteedSeatsPercent: z.number().int().min(0).max(100).nullish(),
		/** The age range on the first conference day; empty switches a limit off. */
		participantMinAge: ageLimitSchema(),
		participantMaxAge: ageLimitSchema(),
		supervisorMinAge: ageLimitSchema(),
		startConference: z.date({
			message: m.pleaseEnterAValidDate()
		}),
		endConference: z.date({
			message: m.pleaseEnterAValidDate()
		}),
		state: z.union([
			z.literal('PRE'),
			z.literal('PARTICIPANT_REGISTRATION'),
			z.literal('PREPARATION'),
			z.literal('ACTIVE'),
			z.literal('POST')
		]),
		unlockPayments: z.boolean().default(false),
		unlockPostals: z.boolean().default(false),
		feeAmount: z
			.number()
			.positive({
				message: m.pleaseEnterAPositiveNumber()
			})
			.multipleOf(0.01, {
				message: m.pleaseEnterAValidAmount()
			})
			.optional(),
		bankAccountHolder: z.string().optional(),
		iban: z
			.string()
			.regex(
				/^[A-Z]{2}[0-9]{2}[\s]{0,1}[0-9]{4}[\s]{0,1}[0-9]{4}[\s]{0,1}[0-9]{4}[\s]{0,1}[0-9]{4}[\s]{0,1}[0-9]{2}$/,
				{
					message: m.ibanMustBe22Characters()
				}
			)
			.refine((iban) => IBAN.isValid(iban), {
				message: m.pleaseEnterAValidIBAN()
			})
			.optional(),
		bic: z
			.string()
			.regex(/^[A-Z]{4}-?[A-Z]{2}-?[A-Z0-9]{2}-?[A-Z0-9]{3}$/, {
				message: m.pleaseEnterAValidBIC()
			})
			.optional(),
		bankName: z.string().optional(),
		currency: z
			.string()
			.length(3, {
				message: m.currencyMustBe3Characters()
			})
			.optional(),
		postalName: z.string().optional(),
		postalStreet: z.string().optional(),
		postalApartment: z.string().optional(),
		postalZip: z.string().optional(),
		postalCity: z.string().optional(),
		postalCountry: z.string().optional(),
		/** The templates: a picked `File` replaces the stored one, `null` removes it. */
		contractBasePDF: z
			.instanceof(File)
			.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
			.nullish(),
		guardianConsentBasePDF: z
			.instanceof(File)
			.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
			.nullish(),
		mediaConsentBasePDF: z
			.instanceof(File)
			.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
			.nullish(),
		termsAndConditionsBasePDF: z
			.instanceof(File)
			.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
			.nullish(),
		certificateBasePDF: z
			.instanceof(File)
			.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
			.nullish()
	})
	// The same order `updateConference` keeps; shown on the date that is out of it.
	.superRefine((settings, ctx) => {
		const problem = conferenceDatesProblem(settings);
		if (problem === 'deadlineAfterStart') {
			ctx.addIssue({
				code: 'custom',
				path: ['applicationDeadline'],
				message: m.conferenceDeadlineAfterStart()
			});
		}
		if (problem === 'startAfterEnd') {
			ctx.addIssue({
				code: 'custom',
				path: ['endConference'],
				message: m.conferenceStartAfterEnd()
			});
		}
		// The same rule `updateConference` holds the range to.
		const { participantMinAge: min, participantMaxAge: max } = settings;
		if (typeof min === 'number' && typeof max === 'number' && min > max) {
			ctx.addIssue({
				code: 'custom',
				path: ['participantMaxAge'],
				message: m.conferenceAgeRangeOutOfOrder()
			});
		}
	});

export type ConferenceSettings = z.infer<typeof conferenceSettingsFormSchema>;

/** The settings' limits as the mutation takes them: an emptied field lifts its limit (`null`). */
export function limitArgs({
	maxCollectiveGroupSize,
	maxGuaranteedSeatsPerForeignSchool,
	maxForeignGuaranteedSeatsPercent,
	participantMinAge,
	participantMaxAge,
	supervisorMinAge
}: Pick<
	ConferenceSettings,
	| 'maxCollectiveGroupSize'
	| 'maxGuaranteedSeatsPerForeignSchool'
	| 'maxForeignGuaranteedSeatsPercent'
	| 'participantMinAge'
	| 'participantMaxAge'
	| 'supervisorMinAge'
>) {
	return {
		maxCollectiveGroupSize: maxCollectiveGroupSize ?? null,
		maxGuaranteedSeatsPerForeignSchool: maxGuaranteedSeatsPerForeignSchool ?? null,
		maxForeignGuaranteedSeatsPercent: maxForeignGuaranteedSeatsPercent ?? null,
		participantMinAge: participantMinAge ?? null,
		participantMaxAge: participantMaxAge ?? null,
		supervisorMinAge: supervisorMinAge ?? null
	};
}
