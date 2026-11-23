import { snakeCase, pgEnum, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { participantRef } from './participants';
import { fileRef } from './storedFile';
import { teamMember } from './team';
import { user } from './users';

/**
 * The signed application documents of the postal registration: the scans of them, what the
 * automation read off them, and the logins scanners deliver with.
 */

/** Where a scan came from: dropped in, a watched folder, a scanner's email or its WebDAV upload. */
export const postalScanSource = pgEnum('postal_scan_source', [
	'UPLOAD',
	'FOLDER',
	'EMAIL',
	'WEBDAV'
]);

/**
 * A scanned page of a person's documents. It hangs on their part in the conference and goes with it;
 * the bytes follow once the `file-cleanup` job finds nothing pointing at them (`fileRef`).
 */
export const postalScan = snakeCase.table(
	'postal_scan',
	{
		...defaultIdAndTimestamps,
		conferenceParticipantId: participantRef('cascade'),
		fileId: fileRef().notNull(),
		source: postalScanSource().notNull(),
		/**
		 * Names the page by the code printed on it (`pageKeyOf`), so the same paper scanned again, in
		 * whatever file, is the same page.
		 */
		pageKey: text().notNull(),
		/** The fields printed on the page, as its code says: what it is a page of. */
		fields: text().array().notNull(),
		/** What was read off this scan; empty when the fields were not readable. */
		readings: jsonb().$type<{ field: string; state: 'yes' | 'no' | 'unclear' }[]>(),
		/** Whose upload or scanner login it was. */
		uploadedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('postal_scan_conference_participant_id_page_key_key').on(
			table.conferenceParticipantId,
			table.pageKey
		),
		index('postal_scan_file_id_idx').on(table.fileId)
	]
);

/**
 * What an application document asks to tick, write or sign: the fields of `#lib/paperScan/fields`
 * but the child's name, which the form itself prints.
 */
export const agreementField = pgEnum('agreement_field', [
	'termsAccepted',
	'termsPlaceDate',
	'termsSignature',
	'guardianPlaceDate',
	'guardian1Name',
	'guardian2Name',
	'guardian1Signature',
	'guardian2Signature',
	'mediaPhoto',
	'mediaVideo',
	'mediaByDmun',
	'mediaByOthers',
	'mediaInternal',
	'mediaDocumentation',
	'mediaPapers',
	'mediaPress',
	'mediaWebsite',
	'mediaSocial',
	'mediaSearch',
	'mediaAdvertising',
	'mediaPlaceDate',
	'mediaSignature',
	'mediaGuardian1Name',
	'mediaGuardian2Name',
	'mediaGuardianPlaceDate',
	'mediaGuardian1Signature',
	'mediaGuardian2Signature'
]);

/** Ticked or written in, empty, or not read with certainty. */
export const agreementState = pgEnum('agreement_state', ['yes', 'no', 'unclear']);

/** Read off a scan, or set by a person, which no scan changes any more. */
export const agreementSource = pgEnum('agreement_source', ['SCAN', 'MANUAL']);

/**
 * One thing a person did or did not agree to or sign on paper. The team works with the statuses on
 * `conferenceParticipant`; these are the details behind them, which scans fill in.
 */
export const agreementDetail = snakeCase.table(
	'agreement_detail',
	{
		...defaultIdAndTimestamps,
		conferenceParticipantId: participantRef('cascade'),
		field: agreementField().notNull(),
		state: agreementState().notNull(),
		source: agreementSource().notNull()
	},
	(table) => [
		uniqueIndex('agreement_detail_conference_participant_id_field_key').on(
			table.conferenceParticipantId,
			table.field
		)
	]
);

/**
 * A login a team member's scanner delivers scans with, by email or WebDAV, for their conference.
 * What it delivers counts as theirs while they may manage its participants, and it goes with their
 * place on the team. Only a hash of the password is kept; it is random, so it needs no slow one. No
 * relations, so it stays out of the GraphQL schema (as `slackWorkspace`).
 */
export const scannerAccess = snakeCase.table(
	'scanner_access',
	{
		...defaultIdAndTimestamps,
		teamMemberId: text()
			.notNull()
			.references(() => teamMember.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** What they call the device. */
		name: text().notNull(),
		username: text().notNull(),
		passwordHash: text().notNull(),
		/** From then on it delivers nothing until its owner renews it. */
		expiresAt: timestamp({ precision: 3 }).notNull(),
		lastUsedAt: timestamp({ precision: 3 })
	},
	(table) => [
		uniqueIndex('scanner_access_username_key').on(table.username),
		index('scanner_access_team_member_id_idx').on(table.teamMemberId)
	]
);
