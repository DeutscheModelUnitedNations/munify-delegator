import valiator from 'validator';
import IBAN from 'iban';
import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

export const conferenceSettingsFormSchema = z.object({
	title: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	info: z.string().nullish(),
	showInfoExpanded: z.boolean().default(false),
	linkToPreparationGuide: z.string().nullish(),
	linkToTeamWiki: z.string().nullish(),
	linkToServicesPage: z.string().nullish(),
	isOpenPaperSubmission: z.boolean().default(false),
	showCalendar: z.boolean().default(false),
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
	language: z
		.string()
		.min(2, {
			message: m.atLeastXChars({ amount: 2 })
		})
		.optional(),
	website: z
		.string()
		.refine((s) => valiator.isURL(s, { protocols: ['http', 'https'] }), {
			message: m.pleaseEnterAValidWebsite()
		})
		.optional(),
	image: z
		.instanceof(File)
		.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
		.optional(),
	emblem: z
		.instanceof(File)
		.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
		.optional(),
	logo: z
		.instanceof(File)
		.refine((f) => f.size < 1_000_000, 'Max 1mb upload size.')
		.optional(),
	startAssignment: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	registrationDeadlineGracePeriodMinutes: z.coerce.number(),
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
	accountHolder: z.string().optional(),
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
	contractBasePDF: z
		.instanceof(File)
		.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
		.optional(),
	guardianConsentBasePDF: z
		.instanceof(File)
		.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
		.optional(),
	mediaConsentBasePDF: z
		.instanceof(File)
		.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
		.optional(),
	termsAndConditionsBasePDF: z
		.instanceof(File)
		.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
		.optional(),
	certificateBasePDF: z
		.instanceof(File)
		.refine((f) => (f.size ? f.size < 10_000_000 : true), 'Max 10mb upload size.')
		.optional()
});
