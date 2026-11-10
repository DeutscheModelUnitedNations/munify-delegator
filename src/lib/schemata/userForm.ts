import validator from 'validator';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';
import {
	isValidPhoneNumber,
	parsePhoneNumberFromString,
	findPhoneNumbersInText
} from 'libphonenumber-js';
import { isPersonName } from '#lib/helpers/personName';
import { addressIssues, type AddressIssue } from '#lib/helpers/addressRules';

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
		.min(5, { message: m.atLeastXChars({ amount: 5 }) })
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
	if (path === 'zip') return m.pleaseEnterAZipCode();
	if (path === 'city') return m.pleaseEnterACity();
	return m.pleaseSelectRegion();
}

export const userFormSchema = userFormFields.superRefine(checkAddress);

/**
 * What a profile update names, each field checked on its own; an address comes whole (its country
 * decides which parts it needs), so it is checked whole too.
 */
export const userUpdateSchema = userFormFields.partial().superRefine((user, ctx) => {
	if (user.country !== undefined) checkAddress(user, ctx);
});

/** The user card's form: the same, but the newsletter choices are the person's own to make. */
export const adminUserFormSchema = userFormFields
	.omit({ wantsToReceiveGeneralInformation: true, wantsJoinTeamInformation: true })
	.superRefine(checkAddress);

/** A field of the profile `userFormSchema` judges, named the way the form names it. */
export type ProfileField = keyof typeof userFormFields.shape;

/** Every profile field, in the order the form asks for them. */
export const PROFILE_FIELDS = userFormSchema.keyof().options;

function isProfileField(key: PropertyKey | undefined): key is ProfileField {
	return PROFILE_FIELDS.some((field) => field === key);
}

/**
 * A stored user row in the shape the form's schema reads: the form still names the two name
 * fields the way the OIDC claims do.
 */
function toFormShape<T extends { givenName: unknown; familyName: unknown }>(user: T) {
	const { givenName, familyName, ...rest } = user;
	return { ...rest, given_name: givenName, family_name: familyName };
}

/** A stored user row, as far as judging its profile goes. */
export type StoredProfile = Parameters<typeof addressIssues>[0] & {
	givenName: unknown;
	familyName: unknown;
};

/**
 * The fields of a stored user row the account form would refuse, in the form's order; empty for a
 * complete profile. What the login sends people to `/my-account` for, the plausibility page lists
 * and an application is held back by.
 */
export function invalidProfileFields(user: StoredProfile): ProfileField[] {
	const result = userFormSchema.safeParse(toFormShape(user));
	if (result.success) return [];
	// zod skips the address check while another field fails, so it is asked on its own
	const failing = new Set([
		...result.error.issues.map((issue) => issue.path[0]).filter(isProfileField),
		...addressIssues(user).map((issue) => issue.path)
	]);
	return PROFILE_FIELDS.filter((field) => failing.has(field));
}
