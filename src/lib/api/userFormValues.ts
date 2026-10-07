/**
 * Turns a stored user row into the shape `userFormSchema` expects.
 *
 * The columns are nullable and the enums are plain strings once they come back through GraphQL,
 * while the form wants non-null values and narrowed unions. Both the account page and the admin
 * user card seed their form from here so the two cannot drift apart.
 */

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
	country?: string | null;
	gender?: string | null;
	pronouns?: string | null;
	foodPreference?: string | null;
	emergencyContacts?: string | null;
};

function toBirthday(value: Date | string | null | undefined): Date {
	if (value instanceof Date) return value;
	return value ? new Date(value) : youngestAllowedBirthday();
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
		country: toText(source.country),
		gender: toGender(source.gender),
		pronouns: source.pronouns ?? null,
		foodPreference: toFoodPreference(source.foodPreference),
		emergencyContacts: toText(source.emergencyContacts)
	};
}
