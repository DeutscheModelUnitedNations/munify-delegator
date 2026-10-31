import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	integer,
	doublePrecision,
	boolean,
	uniqueIndex,
	jsonb,
	type UpdateDeleteAction
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { fileRef } from './storedFile';

/** A conference. */

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
	applicationDeadline: timestamp({ precision: 3 }).notNull(),
	startConference: timestamp({ precision: 3 }).notNull(),
	state: conferenceState().default('PRE').notNull(),
	imageFileId: fileRef(),
	info: text(),
	linkToPreparationGuide: text(),
	bankAccountHolder: text(),
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
	/**
	 * Where the generated parts go on each template - the certificate, the contract, the consents -
	 * by document (`#lib/helpers/documentLayout.ts`); a document or element without one uses its default.
	 */
	documentLayouts: jsonb(),
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
