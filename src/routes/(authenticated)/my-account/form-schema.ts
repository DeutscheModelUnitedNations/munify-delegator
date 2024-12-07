import valiator from 'validator';
import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';
import { languageTag } from '$lib/paraglide/runtime';

// must be at least 13 years old
const birthdayMaxDate = new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000);

export const userFormSchema = z.object({
	birthday: z.date().max(birthdayMaxDate, {
		message: m.dateMustBeBefore({
			date: birthdayMaxDate.toLocaleDateString(languageTag())
		})
	}),
	phone: z
		.string()
		.transform((s) => s.replaceAll(' ', ''))
		.transform((s) => s.replaceAll('-', ''))
		.refine((s) => valiator.isMobilePhone(s, 'any', { strictMode: true }), {
			message: m.pleaseEnterAValidPhoneNumber()
		}),
	street: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	apartment: z.string().nullish(),
	zip: z.string().refine((s) => valiator.isPostalCode(s, 'any'), {
		message: m.pleaseEnterAZipCpode()
	}),
	city: z.string().min(3, {
		message: m.atLeastXChars({ amount: 3 })
	}),
	country: z.string().refine(valiator.isISO31661Alpha3),
	gender: z
		.string()
		.min(1)
		.max(1)
		.refine((s) => ['m', 'f', 'd', 'n'].includes(s)),
	pronouns: z.string().min(3),
	foodPreference: z.string().refine((s) => ['OMNIVORE', 'VEGETARIAN', 'VEGAN'].includes(s)),
	wantsToReceiveGeneralInformation: z.boolean().default(false),
	wantsJoinTeamInformation: z.boolean().default(false)
});
