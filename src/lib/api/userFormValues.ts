/**
 * Turns a stored user row into the shape `userFormSchema` expects.
 *
 * The columns are nullable and the enums are plain strings once they come back through GraphQL,
 * while the form wants non-null values and narrowed unions. Both the account page and the admin
 * user card seed their form from here so the two cannot drift apart.
 */

import type { z } from 'zod';
import type {
	adminUserFormSchema,
	userFormSchema
} from '../../routes/(authenticated)/my-account/form-schema';
import { alpha3ToAlpha2 } from '$lib/helpers/countryCodes';
import { addressRules } from '$lib/helpers/addressRules';
import { fromCalendarDay, toCalendarDay } from '$lib/helpers/calendarDay';

type Gender = 'MALE' | 'FEMALE' | 'DIVERSE' | 'NO_STATEMENT';
type FoodPreference = 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN';

/** The 13-year-old the schema's birthday check treats as the youngest allowed. */
function youngestAllowedBirthday() {
	return new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000);
}

function toGender(value: string | null | undefined): Gender {
	if (value === 'MALE' || value === 'FEMALE' || value === 'DIVERSE' || value === 'NO_STATEMENT') {
		return value;
	}
	return 'NO_STATEMENT';
}

function toFoodPreference(value: string | null | undefined): FoodPreference {
	if (value === 'OMNIVORE' || value === 'VEGETARIAN' || value === 'VEGAN') {
		return value;
	}
	return 'OMNIVORE';
}

export type UserFormSource = {
	givenName?: string | null;
	familyName?: string | null;
	birthday?: Date | string | null;
	phone?: string | null;
	street?: string | null;
	apartment?: string | null;
	zip?: string | null;
	city?: string | null;
	region?: string | null;
	country?: string | null;
	gender?: string | null;
	pronouns?: string | null;
	foodPreference?: string | null;
	emergencyContacts?: string | null;
};

/** The stored day (UTC midnight, see `calendarDay`) as the local day the date picker shows. */
function toBirthday(value: Date | string | null | undefined): Date {
	if (!value) return youngestAllowedBirthday();
	return fromCalendarDay(value instanceof Date ? value : new Date(value));
}

/** A required text field starts out empty rather than null. */
function toText(value: string | null | undefined): string {
	return value ?? '';
}

export function buildUserFormValues(user: UserFormSource | null | undefined) {
	const source: UserFormSource = user ?? {};
	return {
		given_name: toText(source.givenName),
		family_name: toText(source.familyName),
		birthday: toBirthday(source.birthday),
		phone: toText(source.phone),
		street: toText(source.street),
		apartment: source.apartment ?? null,
		zip: toText(source.zip),
		city: toText(source.city),
		region: toText(source.region),
		country: toText(source.country),
		gender: toGender(source.gender),
		pronouns: source.pronouns ?? null,
		foodPreference: toFoodPreference(source.foodPreference),
		emergencyContacts: toText(source.emergencyContacts)
	};
}

/** What `userFormSchema` (or the user card's form, which has no newsletter choices) validates to. */
type UserFormData = z.output<typeof adminUserFormSchema> &
	Partial<
		Pick<
			z.output<typeof userFormSchema>,
			'wantsToReceiveGeneralInformation' | 'wantsJoinTeamInformation'
		>
	>;

/** Empty optional fields are left out rather than sent as empty strings. */
function optionalText(value: string | null | undefined): string | undefined {
	return value?.trim() || undefined;
}

/**
 * The `updateUser` arguments for a validated form, shared by the account page and the admin user
 * card. The address goes as rumble's `AddressInput`, which speaks alpha-2 country codes, and the
 * birthday as the calendar day that was picked.
 */
export function toUpdateUserArgs(id: string, values: UserFormData) {
	const { given_name, family_name, birthday, street, zip, city, region, country, ...rest } = values;
	// a field the country does not use may still hold what was typed before switching country
	const uses = addressRules(country);
	return {
		...rest,
		id,
		givenName: given_name,
		familyName: family_name,
		birthday: toCalendarDay(birthday),
		apartment: optionalText(rest.apartment),
		pronouns: optionalText(rest.pronouns),
		address: {
			streetAddress: street,
			postalCode: uses.zip ? optionalText(zip) : undefined,
			locality: uses.city ? optionalText(city) : undefined,
			region: uses.region ? optionalText(region) : undefined,
			countryCode: alpha3ToAlpha2(country) ?? country
		}
	};
}
