import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	integer,
	doublePrecision,
	boolean,
	uniqueIndex,
	type UpdateDeleteAction
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { fileRef } from './storedFile';
import { school } from './schools';

/** A conference, its places and the duplicate schools found among its applications. */

/**
 * A required reference to the conference a row belongs to. Every foreign key in the schema
 * cascades on update; what differs between tables is only how a delete of the parent behaves.
 * Functions rather than shared builders, so each table gets its own column instance.
 */
export function conferenceRef(onDelete: UpdateDeleteAction) {
	return text()
		.notNull()
		.references(() => conference.id, { onDelete, onUpdate: 'cascade' });
}

export const conferenceState = pgEnum('conference_state', [
	'PRE',
	'PARTICIPANT_REGISTRATION',
	'PREPARATION',
	'ACTIVE',
	'POST'
]);

export const reviewHelpStatus = pgEnum('review_help_status', [
	'UNSPECIFIED',
	'HELP_NEEDED',
	'NO_HELP_WANTED'
]);

export const conference = snakeCase.table('conference', {
	...defaultIdAndTimestamps,
	title: text().notNull(),
	longTitle: text(),
	location: text(),
	/**
	 * The conference's language, one of `CONFERENCE_LANGUAGES`: its nations are filed and printed in
	 * it on the nametag tables, so everyone is sent to the same table whatever language their own
	 * interface uses. Anything else (older free-text values) reads as German.
	 */
	language: text(),
	website: text(),
	endConference: timestamp({ precision: 3 }).notNull(),
	startAssignment: timestamp({ precision: 3 }).notNull(),
	startConference: timestamp({ precision: 3 }).notNull(),
	state: conferenceState().default('PRE').notNull(),
	imageFileId: fileRef(),
	info: text(),
	linkToPreparationGuide: text(),
	accountHolder: text(),
	bankName: text(),
	bic: text(),
	currency: text().default('EUR'),
	feeAmount: doublePrecision(),
	guardianConsentFileId: fileRef(),
	iban: text(),
	mediaConsentFileId: fileRef(),
	postalApartment: text(),
	postalCity: text(),
	postalCountry: text(),
	postalName: text(),
	postalStreet: text(),
	postalZip: text(),
	termsAndConditionsFileId: fileRef(),
	unlockPayments: boolean().default(false).notNull(),
	unlockPostals: boolean().default(false).notNull(),
	linkToPaperInbox: text(),
	contractFileId: fileRef(),
	certificateFileId: fileRef(),
	registrationDeadlineGracePeriodMinutes: integer().default(30).notNull(),
	isOpenPaperSubmission: boolean().default(false).notNull(),
	emblemFileId: fileRef(),
	showInfoExpanded: boolean().default(false).notNull(),
	linkToServicesPage: text(),
	linkToTeamWiki: text(),
	logoFileId: fileRef(),
	showCalendar: boolean().default(false).notNull(),
	timezone: text().default('Europe/Berlin').notNull(),
	/** Whether participants see the roles they were assigned. The team always does. */
	assignmentReleased: boolean().default(false).notNull(),
	assignmentReleasedAt: timestamp({ precision: 3 }),
	/** Into how many bins (by the first letter of the nation) the nametag handout is split. */
	nametagBinCount: integer().default(3).notNull(),
	/**
	 * How many seats one school may be given; the assignment warns beyond it. Empty means no
	 * limit.
	 */
	maxSeatsPerSchool: integer().default(16)
});

export const place = snakeCase.table(
	'place',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		address: text(),
		latitude: doublePrecision(),
		longitude: doublePrecision(),
		directions: text(),
		info: text(),
		websiteUrl: text(),
		sitePlanFileId: fileRef(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('place_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

/**
 * A group of schools that most likely are the same school, found by the analysis the cleanup page
 * runs over the schools a conference's applications name. `key` is the group's sorted school ids
 * as JSON, so a rerun finds the row again and keeps the team's decision; a group that gains or
 * loses a school is a new row.
 */
export const schoolSuggestion = snakeCase.table(
	'school_suggestion',
	{
		...defaultIdAndTimestamps,
		key: text().notNull(),
		similarity: doublePrecision().notNull(),
		/** The team decided these are different schools. */
		dismissed: boolean().default(false).notNull(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('school_suggestion_conference_id_key_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.key.asc().nullsLast()
		)
	]
);

/** One school of a suggestion, with how many participants of the conference named it. */
export const schoolSuggestionVariant = snakeCase.table(
	'school_suggestion_variant',
	{
		...defaultIdAndTimestamps,
		schoolId: text()
			.notNull()
			.references(() => school.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		sumParticipants: integer().notNull(),
		suggestionId: text()
			.notNull()
			.references(() => schoolSuggestion.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('school_suggestion_variant_suggestion_id_school_id_key').using(
			'btree',
			table.suggestionId.asc().nullsLast(),
			table.schoolId.asc().nullsLast()
		)
	]
);
