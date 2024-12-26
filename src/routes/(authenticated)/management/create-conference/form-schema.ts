import valiator from 'validator';
import IBAN from 'iban';
import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

const committeeCreationSchema = z.object({
	name: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	abbreviation: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	numOfSeatsPerDelegation: z.number().min(1, {
		message: m.atLeastNumber({ amount: 1 })
	}),
	representedNationsAlpha3Codes: z.array(z.string().refine(valiator.isISO31661Alpha3))
});

const nsaCreationSchema = z.object({
	name: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	abbreviation: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	description: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	fontAwesomeIcon: z.string().nullish(),
	seatAmount: z.number().min(1, {
		message: m.atLeastNumber({ amount: 1 })
	})
});

export const conferenceCreationFormSchema = z.object({
	title: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	info: z.string().nullish(),
	linkToPreparationGuide: z.string().nullish(),
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
	startAssignment: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	startConference: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	endConference: z.date({
		message: m.pleaseEnterAValidDate()
	}),
	feeAmount: z.number().optional(),
	accountHolder: z.string().optional(),
	iban: z
		.string()
		.length(22, {
			message: m.ibanMustBe22Characters()
		})
		.refine((iban) => IBAN.isValid(iban), {
			message: m.pleaseEnterAValidIBAN()
		})
		.optional(),
	bic: z
		.string()
		.length(8, {
			message: m.bicMustBe8Characters()
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
	termsAndConditionsContent: z.string().optional(),
	guardianConsentContent: z.string().optional(),
	mediaConsentContent: z.string().optional(),
	committees: z.array(committeeCreationSchema).min(1, {
		message: m.atLeastNumber({ amount: 1 })
	}),
	nonStateActors: z.array(nsaCreationSchema).min(1, {
		message: m.atLeastNumber({ amount: 1 })
	})
});
