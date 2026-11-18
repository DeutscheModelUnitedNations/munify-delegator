import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	integer,
	doublePrecision,
	boolean,
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
	 * The students of one supervisor from one school who applied are a group; up to this many,
	 * the team decides on them together (all get a seat or none), and the assignment warns when a
	 * plan seats only some. A bigger group is treated like everyone else. Empty switches it off.
	 */
	maxCollectiveGroupSize: integer().default(16),
	/**
	 * How many people of one Auslandsschule (`school.isForeignSchool`) may be given a guaranteed
	 * seat (`assignmentReview.required`); the assignment warns beyond it. Empty means no limit.
	 */
	maxGuaranteedSeatsPerForeignSchool: integer().default(12),
	/**
	 * Which share (in percent) of all the conference's seats the Auslandsschulen together may be
	 * given as guaranteed seats; the assignment warns beyond it. Empty means no limit.
	 */
	maxForeignGuaranteedSeatsPercent: integer().default(20),
	/**
	 * The age range on the first conference day (`#lib/helpers/plausibilityRules`): participants
	 * from `participantMinAge` to `participantMaxAge`, supervisors from `supervisorMinAge`. Outside it the entry flows warn and the plausibility page lists people;
	 * nothing is refused. Empty switches that limit off.
	 */
	participantMinAge: integer().default(15),
	participantMaxAge: integer().default(21),
	supervisorMinAge: integer().default(21),
	/** How many mails a sweep sends per second at most. Empty means as fast as it can. */
	emailsPerSecond: integer(),
	/**
	 * Whether the team may reach the conference through AI assistants (the MCP server,
	 * `src/api/mcp/`). Project management switches it on; off, no assistant sees anything of it.
	 */
	mcpEnabled: boolean().default(false).notNull(),
	/**
	 * Whether the people of the conference can write each other inside the app (`chat`). Off, the
	 * chats there are stay readable and nothing new is written.
	 */
	messagingEnabled: boolean().default(false).notNull()
});
