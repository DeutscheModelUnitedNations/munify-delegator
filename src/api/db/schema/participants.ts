import {
	snakeCase,
	pgEnum,
	text,
	integer,
	boolean,
	index,
	uniqueIndex,
	type UpdateDeleteAction
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, implicitManyToMany } from './helpers';
import { schoolRef } from './schools';
import { userRef } from './users';
import { conferenceRef } from './conference';

/** A person's part in a conference, and who supervises whom. */

/**
 * The person's part in the conference a registration belongs to (`conferenceParticipant`), which
 * says the same as the row's `conferenceId` and `userId`. Supervision goes through it.
 */
export function participantRef(onDelete: UpdateDeleteAction = 'restrict') {
	return text()
		.notNull()
		.references(() => conferenceParticipant.id, { onDelete, onUpdate: 'cascade' });
}

export const administrativeStatus = pgEnum('administrative_status', ['DONE', 'PROBLEM', 'PENDING']);

export const mediaConsentStatus = pgEnum('media_consent_status', [
	'NOT_SET',
	'ALLOWED_ALL',
	'PARTIALLY_ALLOWED',
	'NOT_ALLOWED'
]);

/**
 * A person's part in a conference: one row per user and conference, created when they first
 * register there - as a delegate, single participant or supervisor - and kept while they take part.
 * It holds what is about the person rather than their seat (payment, postal documents, attendance,
 * the access card) and is what supervision links to, so a supervisor keeps their student however
 * the assignment moves them. `delegationMember`, `singleParticipant` and `conferenceSupervisor`
 * point here; `ensureConferenceParticipant` creates it.
 */
export const conferenceParticipant = snakeCase.table(
	'conference_participant',
	{
		...defaultIdAndTimestamps,
		userId: userRef('restrict'),
		conferenceId: conferenceRef('restrict'),
		paymentStatus: administrativeStatus().default('PENDING').notNull(),
		didAttend: boolean().default(false).notNull(),
		guardianConsent: administrativeStatus().default('PENDING').notNull(),
		mediaConsent: administrativeStatus().default('PENDING').notNull(),
		termsAndConditions: administrativeStatus().default('PENDING').notNull(),
		mediaConsentStatus: mediaConsentStatus().default('NOT_SET').notNull(),
		// The database column keeps the original typo; the code and the API do not.
		assignedDocumentNumber: integer('assigend_document_number'),
		accessCardId: text(),
		/**
		 * The person's own school, the only place a school of someone taking part is kept. Given when
		 * they apply (or carried over from their waiting list entry), changed by themselves or by
		 * participant care, and kept when the assignment merges delegations of several schools, so
		 * seats and metrics per school count people, not delegations.
		 */
		schoolId: schoolRef()
	},
	(table) => [
		// Shortened by hand: the name derived from the column list was 67 chars and
		// Postgres truncates identifiers at 63, which would leave the database and
		// this file permanently disagreeing on the index name.
		uniqueIndex('conference_participant_conference_id_doc_number_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedDocumentNumber.asc().nullsLast()
		),
		// One card per person: Postgres lets any number of rows without a card share the NULL.
		uniqueIndex('conference_participant_conference_id_access_card_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.accessCardId.asc().nullsLast()
		),
		// every "rows of conference X" filter through the anchor starts here
		index('conference_participant_conference_id_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast()
		),
		uniqueIndex('conference_participant_user_id_conference_id_key').using(
			'btree',
			table.userId.asc().nullsLast(),
			table.conferenceId.asc().nullsLast()
		)
	]
);

export const conferenceSupervisor = snakeCase.table(
	'conference_supervisor',
	{
		...defaultIdAndTimestamps,
		/** The supervisor's own part in the conference; it says which conference and who. */
		conferenceParticipantId: participantRef(),
		plansOwnAttendenceAtConference: boolean().notNull(),
		connectionCode: text().notNull()
	},
	(table) => [
		// Unique across conferences, so a code alone names its supervisor.
		uniqueIndex('conference_supervisor_connection_code_key').using(
			'btree',
			table.connectionCode.asc().nullsLast()
		),
		uniqueIndex('conference_supervisor_conference_participant_id_key').using(
			'btree',
			table.conferenceParticipantId.asc().nullsLast()
		)
	]
);

/**
 * Who supervises whom (`a` the supervisor, `b` the supervised person's `conferenceParticipant`).
 * It links people, not seats, so it outlives whatever registration the student holds.
 */
export const supervision = implicitManyToMany({
	name: 'supervision',
	a: () => conferenceSupervisor.id,
	b: () => conferenceParticipant.id
});
