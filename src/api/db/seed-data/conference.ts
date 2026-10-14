import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

const CONFERENCE_STATES = [
	'PRE',
	'PARTICIPANT_REGISTRATION',
	'PREPARATION',
	'ACTIVE',
	'POST'
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A random date between `fromDays` and `toDays` days from now. */
const inDays = (fromDays: number, toDays: number) => () =>
	faker.date.between({
		from: new Date(Date.now() + fromDays * DAY_MS),
		to: new Date(Date.now() + toDays * DAY_MS)
	});
const past = () => faker.date.past();
const future = () => faker.date.future();

type ConferenceDates = Record<'startAssignment' | 'startConference' | 'endConference', () => Date>;

/** Plausible dates for a conference in each state, relative to now. */
const DATES_BY_STATE: Record<(typeof CONFERENCE_STATES)[number], ConferenceDates> = {
	// Assignment in at least a week, the conference in at least two.
	PRE: {
		startAssignment: inDays(7, 14),
		startConference: inDays(15, 21),
		endConference: inDays(30, 35)
	},
	PARTICIPANT_REGISTRATION: {
		startAssignment: past,
		startConference: inDays(7, 14),
		endConference: inDays(30, 35)
	},
	PREPARATION: {
		startAssignment: past,
		startConference: inDays(7, 14),
		endConference: inDays(30, 35)
	},
	ACTIVE: { startAssignment: past, startConference: past, endConference: future },
	POST: { startAssignment: past, startConference: past, endConference: past }
};

export function makeSeedConference(
	options?: Partial<
		Pick<
			typeof schema.conference.$inferInsert,
			'state' | 'startAssignment' | 'startConference' | 'endConference'
		>
	>
): typeof schema.conference.$inferInsert {
	const state = options?.state ?? faker.helpers.arrayElement(CONFERENCE_STATES);
	const dates = DATES_BY_STATE[state];
	// Generated in this order, and only where not given, so a seeded faker stays reproducible.
	const startAssignment = options?.startAssignment || dates.startAssignment();
	const startConference = options?.startConference || dates.startConference();
	const endConference = options?.endConference || dates.endConference();

	return {
		id: faker.database.mongodbObjectId(),
		title: faker.company.name(),
		longTitle: `${faker.company.name()} Konferenz`,
		location: faker.location.city(),
		language: 'deu',
		website: faker.internet.url(),
		info: faker.company.catchPhrase(),
		state,
		startAssignment,
		startConference,
		endConference,
		// The form requires a positive fee, so never seed a zero.
		feeAmount: faker.number.int({ min: 1, max: 200 }),
		accountHolder: faker.person.fullName(),
		// `conferenceSettingsFormSchema` accepts only the 22-character IBAN layout and an
		// 11-character BIC, so an arbitrary country's IBAN or a bare 8-character BIC would make the
		// conference settings form refuse to save on a freshly seeded database.
		iban: faker.finance.iban({ countryCode: 'DE', formatted: false }),
		bic: faker.finance.bic({ includeBranchCode: true }),
		bankName: faker.company.name(),
		postalName: faker.person.fullName(),
		postalStreet: faker.location.streetAddress(),
		postalApartment: faker.location.buildingNumber(),
		postalZip: faker.location.zipCode(),
		postalCity: faker.location.city(),
		postalCountry: faker.location.country(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past(),
		linkToPreparationGuide: faker.internet.url(),
		unlockPayments: state === 'PREPARATION',
		unlockPostals: state === 'PREPARATION',
		currency: faker.finance.currencyCode()
	};
}
