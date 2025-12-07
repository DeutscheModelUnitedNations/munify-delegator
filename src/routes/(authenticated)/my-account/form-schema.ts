import valiator from 'validator';
import { z } from 'zod';
import { m } from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import {
	isValidPhoneNumber,
	parsePhoneNumberFromString,
	findPhoneNumbersInText
} from 'libphonenumber-js';

// must be at least 13 years old
const birthdayMaxDate = new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000);

export const userFormSchema = z.object({
	birthday: z.date().max(birthdayMaxDate, {
		message: m.dateMustBeBefore({
			date: birthdayMaxDate.toLocaleDateString(getLocale())
		})
	}),
	phone: z
		.string()
		.refine((s) => isValidPhoneNumber(s), {
			message: m.pleaseEnterAValidPhoneNumber()
		})
		.transform((s) => {
			const phoneNumber = parsePhoneNumberFromString(s);
			if (phoneNumber) {
				return phoneNumber.formatInternational();
			}
			return s;
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
	gender: z.union([
		z.literal('MALE'),
		z.literal('FEMALE'),
		z.literal('DIVERSE'),
		z.literal('NO_STATEMENT')
	]),
	pronouns: z.string().nullish(),
	foodPreference: z.string().refine((s) => ['OMNIVORE', 'VEGETARIAN', 'VEGAN'].includes(s)),
	emergencyContacts: z
		.string()
		.min(5)
		.transform((s) => {
			const phoneNumbers = findPhoneNumbersInText(s);
			let res: string = '';
			for (const output of phoneNumbers) {
				const partBefore = s.substring(0, output.startsAt);
				const partAfter = s.substring(output.endsAt);
				res = partBefore + output.number.formatInternational() + partAfter;
			}
			return res || s;
		}),
	wantsToReceiveGeneralInformation: z.boolean().default(false),
	wantsJoinTeamInformation: z.boolean().default(false)
});
