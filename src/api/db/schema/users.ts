import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	doublePrecision,
	date,
	boolean,
	index,
	uniqueIndex,
	type UpdateDeleteAction
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, trigramIndex } from './helpers';

/** Accounts and what belongs to a person across conferences. */

/** A required reference to the user a row belongs to; see `conferenceRef`. */
export function userRef(onDelete: UpdateDeleteAction) {
	return text()
		.notNull()
		.references(() => user.id, { onDelete, onUpdate: 'cascade' });
}

export const gender = pgEnum('gender', ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT']);

export const foodPreference = pgEnum('food_preference', ['OMNIVORE', 'VEGETARIAN', 'VEGAN']);

export const user = snakeCase.table(
	'user',
	{
		...defaultIdAndTimestamps,
		email: text().notNull(),
		familyName: text('family_name').notNull(),
		givenName: text('given_name').notNull(),
		locale: text().notNull(),
		preferredUsername: text('preferred_username').notNull(),
		// a calendar day: the `Date` scalar carries it as YYYY-MM-DD, read as UTC midnight
		birthday: date({ mode: 'date' }),
		phone: text(),
		street: text(),
		apartment: text(),
		zip: text(),
		city: text(),
		// state, province or prefecture where the country's addresses have one (rumble's AddressInput)
		region: text(),
		// ISO 3166-1 alpha-3
		country: text(),
		pronouns: text(),
		foodPreference: foodPreference(),
		wantsToReceiveGeneralInformation: boolean().default(false).notNull(),
		wantsJoinTeamInformation: boolean().default(false).notNull(),
		gender: gender(),
		emergencyContacts: text(),
		globalNotes: text()
	},
	(table) => [
		uniqueIndex('user_email_key').using('btree', table.email.asc().nullsLast()),
		trigramIndex('user_id_trgm', table.id),
		trigramIndex('user_email_trgm', table.email),
		trigramIndex('user_given_name_trgm', table.givenName),
		trigramIndex('user_family_name_trgm', table.familyName),
		trigramIndex('user_preferred_username_trgm', table.preferredUsername),
		trigramIndex('user_locale_trgm', table.locale),
		trigramIndex('user_pronouns_trgm', table.pronouns),
		trigramIndex('user_street_trgm', table.street),
		trigramIndex('user_apartment_trgm', table.apartment),
		trigramIndex('user_zip_trgm', table.zip),
		trigramIndex('user_city_trgm', table.city),
		trigramIndex('user_region_trgm', table.region),
		trigramIndex('user_country_trgm', table.country),
		trigramIndex('user_phone_trgm', table.phone),
		trigramIndex('user_emergency_contacts_trgm', table.emergencyContacts),
		trigramIndex('user_global_notes_trgm', table.globalNotes)
	]
);

export const possibleDuplicateStatus = pgEnum('possible_duplicate_status', [
	'OPEN',
	'DISMISSED',
	'CONFIRMED'
]);

/**
 * Two accounts that may belong to one person (`#api/handlers/possibleDuplicate/possibleDuplicates.js` finds them),
 * so a care note on the old one is not lost to a fresh signup. Stored rather than computed on
 * read so a dismissal sticks and a re-scan only refreshes the score. `userId` is the smaller of the
 * two ids, so each pair has one row.
 */
export const possibleDuplicate = snakeCase.table(
	'possible_duplicate',
	{
		...defaultIdAndTimestamps,
		userId: userRef('cascade'),
		candidateId: userRef('cascade'),
		score: doublePrecision().notNull(),
		/** `MatchReason`s: which signals the two accounts share */
		reasons: text().array().notNull(),
		status: possibleDuplicateStatus().notNull().default('OPEN'),
		decidedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		decidedAt: timestamp({ precision: 3 })
	},
	(table) => [
		uniqueIndex('possible_duplicate_user_id_candidate_id_key').on(table.userId, table.candidateId),
		index('possible_duplicate_candidate_id_idx').on(table.candidateId)
	]
);
