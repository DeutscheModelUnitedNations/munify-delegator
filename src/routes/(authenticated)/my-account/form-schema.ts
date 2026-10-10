import validator from 'validator';
import { z } from 'zod';
import { m } from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import {
	isValidPhoneNumber,
	parsePhoneNumberFromString,
	findPhoneNumbersInText
} from 'libphonenumber-js';
import { isPersonName } from '$lib/helpers/personName';
import { addressIssues, type AddressIssue } from '$lib/helpers/addressRules';

// must be at least 13 years old
const birthdayMaxDate = new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000);

/** The fields on their own; `userFormSchema` adds the checks that look at several at once. */
const userFormFields = z.object({
	given_name: z
		.string()
		.min(1, { message: m.atLeastXChars({ amount: 1 }) })
		.refine(isPersonName, { message: m.invalidPersonName() }),
	family_name: z
		.string()
		.min(1, { message: m.atLeastXChars({ amount: 1 }) })
		.refine(isPersonName, { message: m.invalidPersonName() }),
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
	// checked by `checkAddress` against the metadata rumble's AddressInput validates with
	zip: z.string().nullish(),
	city: z.string().nullish(),
	region: z.string().nullish(),
	country: z.string().refine(validator.isISO31661Alpha3),
	gender: z.union([
		z.literal('MALE'),
		z.literal('FEMALE'),
		z.literal('DIVERSE'),
		z.literal('NO_STATEMENT')
	]),
	pronouns: z.string().nullish(),
	foodPreference: z.union([z.literal('OMNIVORE'), z.literal('VEGETARIAN'), z.literal('VEGAN')]),
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

/**
 * Whether postal code, city and region are needed, and in which format, depends on the country,
 * so they are checked together. A function rather than a part of the schema because zod refuses
 * to `omit` from a refined object, and the user card's form leaves the newsletter fields out.
 */
function checkAddress(user: Parameters<typeof addressIssues>[0], ctx: z.RefinementCtx) {
	for (const issue of addressIssues(user)) {
		ctx.addIssue({ code: 'custom', path: [issue.path], message: addressIssueMessage(issue) });
	}
}

function addressIssueMessage({ path }: AddressIssue) {
	if (path === 'zip') return m.pleaseEnterAZipCpode();
	if (path === 'city') return m.pleaseEnterACity();
	return m.pleaseSelectRegion();
}

export const userFormSchema = userFormFields.superRefine(checkAddress);

/** The user card's form: the same, but the newsletter choices are the person's own to make. */
export const adminUserFormSchema = userFormFields
	.omit({ wantsToReceiveGeneralInformation: true, wantsJoinTeamInformation: true })
	.superRefine(checkAddress);
