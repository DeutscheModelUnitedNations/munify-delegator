import type { User } from '@prisma/client';
import { availableLanguageTags } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';

/**
 * @param user The user object to check
 * @param lang The language to use for the returned error messages
 *
 * @returns A list of error messages which occurred during checks. Empty if no errors.
 */
export function userDataCompleteCheck(
	user: User,
	languageTag: (typeof availableLanguageTags)[number]
): string[] {
	const requiredFields: { [key in keyof User]: boolean } = {
		birthday: true,
		city: true,
		country: true,
		email: true,
		family_name: true,
		gender: true,
		given_name: true,
		locale: true,
		phone: true,
		preferred_username: true,
		street: true,
		zip: true,
		foodPreference: true,
		id: true,
		pronouns: true,
		// optional
		apartment: false,
		wantsJoinTeamInformation: false,
		wantsToReceiveGeneralInformation: false
	};

	const errors: string[] = [];

	for (const [key, value] of Object.entries(user)) {
		if (requiredFields[key as keyof User] && !value) {
			errors.push(m.valueCannotBeEmpty({ field: key }, { languageTag }));
		}
	}

	if (user.given_name.length < 3) {
		errors.push(m.valueTooShort({ field: 'given_name' }, { languageTag }));
	}

	if (user.family_name.length < 3) {
		errors.push(m.valueTooShort({ field: 'family_name' }, { languageTag }));
	}

	if (!user.phone || user.phone.length < 3) {
		errors.push(m.valueTooShort({ field: 'phone' }, { languageTag }));
	}

	if (!user.street || user.street.length < 3) {
		errors.push(m.valueTooShort({ field: 'street' }, { languageTag }));
	}

	return errors;
}
