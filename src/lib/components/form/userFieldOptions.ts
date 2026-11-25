import { m } from '#lib/paraglide/messages';

/** The choices of the user's gender select. A function, so the labels follow the current locale. */
export const genderOptions = () => [
	{ value: 'MALE', label: m.male() },
	{ value: 'FEMALE', label: m.female() },
	{ value: 'DIVERSE', label: m.diverse() },
	{ value: 'NO_STATEMENT', label: m.noStatement() }
];

/** The choices of the user's diet select. */
export const foodPreferenceOptions = () => [
	{ value: 'VEGAN', label: m.vegan() },
	{ value: 'VEGETARIAN', label: m.vegetarian() },
	{ value: 'OMNIVORE', label: m.omnivore() }
];

/** The name fields of the user forms (`PersonNameFields`). */
export const PERSON_NAME_FIELDS = { givenName: 'given_name', familyName: 'family_name' } as const;

/** The fields about the person of the user forms (`PersonalInformationFields`). */
export const PERSONAL_INFORMATION_FIELDS = {
	birthday: 'birthday',
	gender: 'gender',
	pronouns: 'pronouns',
	foodPreference: 'foodPreference'
} as const;
