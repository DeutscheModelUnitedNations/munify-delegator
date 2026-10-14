import { m } from '$lib/paraglide/messages';

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
