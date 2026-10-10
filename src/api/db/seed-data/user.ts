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
	const country = faker.helpers.weightedArrayElement([
		{ weight: 8, value: 'DEU' },
		{ weight: 1, value: 'AUT' },
		{ weight: 1, value: 'CHE' }
	]);
	return {
		id: faker.database.mongodbObjectId(),
		apartment: faker.helpers.maybe(() => faker.location.buildingNumber()) ?? null,
		street: complete ? faker.location.street() : null,
		// Austrian and Swiss postal codes have four digits, German ones five
		zip: complete
			? faker.string.numeric({ length: country === 'DEU' ? 5 : 4, allowLeadingZeros: false })
			: null,
		birthday: faker.date.birthdate({
			mode: 'age',
			min: options.minAge ?? 14,
			max: options.maxAge ?? 50
		}),
		city: complete ? faker.location.city() : null,
		country,
		email,
		familyName,
		foodPreference: faker.helpers.arrayElement(FOOD_PREFERENCES),
		gender: faker.helpers.arrayElement(GENDERS),
		givenName,
		locale: faker.helpers.arrayElement(['de', 'en']),
		// stored the way the PhoneNumber scalar stores it
		phone: complete ? mobileNumber().replaceAll(' ', '') : null,
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
 * Seven digits of their own for each dev account, so the accounts do not share phone numbers -
 * which the duplicate check would rightly take for one person.
 */
function accountDigits(sub: string, salt: number) {
	let hash = salt;
	for (const char of sub) hash = (hash * 31 + char.charCodeAt(0)) % 10_000_000;
	return String(hash).padStart(7, '0');
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
		phone: complete ? `+49151${accountDigits(account.sub, 1)}` : null,
		street: complete ? 'Platz der Vereinten Nationen 1' : null,
		apartment: null,
		zip: complete ? '53113' : null,
		city: complete ? 'Bonn' : null,
		country: complete ? 'DEU' : null,
		gender: complete ? 'NO_STATEMENT' : null,
		foodPreference: complete ? 'VEGETARIAN' : null,
		pronouns: null,
		emergencyContacts: complete
			? `Erika Mustermann (Mutter): +49 160 ${accountDigits(account.sub, 2)}`
			: null,
		wantsToReceiveGeneralInformation: false,
		wantsJoinTeamInformation: false
	};
}

/** What the care team keeps track of: people who misbehaved at an earlier conference. */
const CARE_NOTES = [
	'Hat auf der letzten Konferenz nachts das Hotelzimmer verlassen und musste abgeholt werden.',
	'Wiederholt respektlos gegenüber anderen Delegierten aufgetreten, Verwarnung im Plenum.',
	'Alkohol im Hotel, Eltern wurden informiert.',
	'Hat Beschlussvorlagen anderer Delegationen ohne Absprache verändert.',
	'Vorsicht bei der Zimmerverteilung: Streit mit Zimmernachbarn.'
] as const;

/** Every sixth participant carries a care note, whichever conference they land in. */
export const careNoteFor = (index: number) =>
	index % 6 === 5 ? CARE_NOTES[Math.floor(index / 6) % CARE_NOTES.length] : null;
