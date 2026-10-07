import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';
import { devEmail, type DevAccount } from './devAccounts';

const FOOD_PREFERENCES = ['OMNIVORE', 'VEGETARIAN', 'VEGAN'] as const;
const GENDERS = ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT'] as const;
const MOBILE_PREFIXES = ['151', '152', '157', '160', '170', '171', '175', '176'] as const;

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/** A German mobile number libphonenumber accepts, which the profile form insists on. */
const mobileNumber = () =>
	`+49 ${faker.helpers.arrayElement(MOBILE_PREFIXES)} ${faker.string.numeric(8)}`;

/** Unique within one seed run: the user table is unique on email. */
let emailCounter = 0;

/**
 * A user with a profile the account form accepts (`userFormSchema`): an ISO alpha-3 country, a
 * valid phone number and zip, emergency contacts. A row that failed it would be flagged as
 * incomplete by the plausibility checks and could not be saved unchanged from the user card.
 * `incomplete` leaves out the fields a half-finished signup lacks.
 */
export function makeSeedUser(
	options: { minAge?: number; maxAge?: number; incomplete?: boolean } = {}
): Insert<'user'> & { id: string } {
	const givenName = faker.person.firstName();
	const familyName = faker.person.lastName();
	const email = faker.internet
		.email({ firstName: givenName, lastName: familyName, provider: 'example.org' })
		.toLowerCase()
		.replace('@', `.${++emailCounter}@`);
	const complete = !options.incomplete;
	return {
		id: faker.database.mongodbObjectId(),
		apartment: faker.helpers.maybe(() => faker.location.buildingNumber()) ?? null,
		street: complete ? faker.location.street() : null,
		zip: complete ? faker.string.numeric({ length: 5, allowLeadingZeros: false }) : null,
		birthday: faker.date.birthdate({
			mode: 'age',
			min: options.minAge ?? 14,
			max: options.maxAge ?? 50
		}),
		city: complete ? faker.location.city() : null,
		country: faker.helpers.weightedArrayElement([
			{ weight: 8, value: 'DEU' },
			{ weight: 1, value: 'AUT' },
			{ weight: 1, value: 'CHE' }
		]),
		email,
		familyName,
		foodPreference: faker.helpers.arrayElement(FOOD_PREFERENCES),
		gender: faker.helpers.arrayElement(GENDERS),
		givenName,
		locale: faker.helpers.arrayElement(['de', 'en']),
		phone: complete ? mobileNumber() : null,
		preferredUsername: faker.internet.username({ firstName: givenName, lastName: familyName }),
		pronouns: faker.helpers.maybe(() =>
			faker.helpers.arrayElement(['er/ihm', 'sie/ihr', 'they/them'])
		),
		emergencyContacts: complete ? `${faker.person.fullName()} (Eltern): ${mobileNumber()}` : null,
		wantsJoinTeamInformation: faker.datatype.boolean(),
		wantsToReceiveGeneralInformation: faker.datatype.boolean(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}

/**
 * The row behind a dev account: its id is the OIDC `sub` and its email the one oidc-mock signs
 * in with, so the login updates this row instead of creating a second one. The birthday puts the
 * account at its stated age a month after its last birthday, so a 16-year-old is still 16 at
 * every seeded conference.
 */
export function makeDevAccountUser(account: DevAccount): Insert<'user'> & { id: string } {
	const birthday = new Date(Date.now() - (account.age ?? 19) * YEAR_MS - 30 * 24 * 60 * 60 * 1000);
	birthday.setUTCHours(0, 0, 0, 0);
	const complete = account.profile === 'complete';
	return {
		id: account.sub,
		email: devEmail(account.sub),
		givenName: account.givenName,
		familyName: account.familyName,
		preferredUsername: account.sub,
		locale: 'de',
		birthday: complete ? birthday : null,
		phone: complete ? '+49 151 23456789' : null,
		street: complete ? 'Platz der Vereinten Nationen 1' : null,
		apartment: null,
		zip: complete ? '53113' : null,
		city: complete ? 'Bonn' : null,
		country: complete ? 'DEU' : null,
		gender: complete ? 'NO_STATEMENT' : null,
		foodPreference: complete ? 'VEGETARIAN' : null,
		pronouns: null,
		emergencyContacts: complete ? 'Erika Mustermann (Mutter): +49 151 98765432' : null,
		wantsToReceiveGeneralInformation: false,
		wantsJoinTeamInformation: false
	};
}
