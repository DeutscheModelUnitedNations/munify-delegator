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

export function toGender(value: string | null | undefined): Gender {
	if (value === 'MALE' || value === 'FEMALE' || value === 'DIVERSE' || value === 'NO_STATEMENT') {
		return value;
	}
	return 'NO_STATEMENT';
}

export function toFoodPreference(value: string | null | undefined): FoodPreference {
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

export function buildUserFormValues(user: UserFormSource | null | undefined) {
	return {
		given_name: user?.givenName ?? '',
		family_name: user?.familyName ?? '',
		birthday:
			user?.birthday instanceof Date
				? user.birthday
				: user?.birthday
					? new Date(user.birthday)
					: youngestAllowedBirthday(),
		phone: user?.phone ?? '',
		street: user?.street ?? '',
		apartment: user?.apartment ?? null,
		zip: user?.zip ?? '',
		city: user?.city ?? '',
		country: user?.country ?? '',
		gender: toGender(user?.gender),
		pronouns: user?.pronouns ?? null,
		foodPreference: toFoodPreference(user?.foodPreference),
		emergencyContacts: user?.emergencyContacts ?? ''
	};
}
