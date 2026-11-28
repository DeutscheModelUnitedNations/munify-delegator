import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	integer,
	bigint,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { participantRef } from './participants';
import { isNull } from 'drizzle-orm';
import type { PageResult } from '../../../lib/paperScan/intake/problems';
import { fileRef } from './storedFile';
import { user } from './users';

/**
 * The signed application documents of the postal registration: the scans of them, what the
 * automation read off them, and the logins scanners deliver with.
 */

/** Where a scan came from: dropped in, a watched folder, a scanner's WebDAV upload, or a photo of the camera. */
export const postalScanSource = pgEnum('postal_scan_source', [
	'UPLOAD',
	'FOLDER',
	'WEBDAV',
	'CAMERA'
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
 * A login somebody's scanner delivers scans with, over WebDAV, into every conference whose participants
 * they manage: each page says which it is of, and is kept as if they uploaded it. Only a hash of the
 * password is kept; it is random, so it needs no slow one. No relations, so it stays out of the GraphQL
 * schema (as `slackWorkspace`).
 */
export const scannerAccess = snakeCase.table(
	'scanner_access',
	{
		...defaultIdAndTimestamps,
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
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
		index('scanner_access_user_id_idx').on(table.userId)
	]
);

/**
 * A file a scanner delivered that is being taken in (`scanQueue`), stored as it came and as large as it may
 * be. It may hold pages of anybody, so nobody reads it; its object is no `stored_file` and goes as soon as it
 * was split into pages. It goes with its owner's account. No relations, so it stays out of the GraphQL schema
 * (as `scannerAccess`).
 */
export const scanDelivery = snakeCase.table(
	'scan_delivery',
	{
		...defaultIdAndTimestamps,
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** What the device was called: its login may be revoked while the file waits. */
		accessName: text().notNull(),
		fileName: text().notNull(),
		/** The object's key in the bucket. */
		key: text().notNull().unique(),
		size: bigint({ mode: 'number' }).notNull()
	},
	(table) => [index('scan_delivery_user_id_idx').on(table.userId)]
);

/** Splitting a delivered file into pages, taking a page in, and telling what came of them all. */
export const scanTaskKind = pgEnum('scan_task_kind', ['SPLIT', 'PAGE', 'FINISH']);

/**
 * What is to be done for a delivered file, each by whoever comes first: it is split, which makes a task of
 * every page, and once those are done its owner is told. Done tasks stay until then, for what they tell.
 */
export const scanTask = snakeCase.table(
	'scan_task',
	{
		...defaultIdAndTimestamps,
		deliveryId: text()
			.notNull()
			.references(() => scanDelivery.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		kind: scanTaskKind().notNull(),
		/** Which page, from 1; 0 for what is of the whole file. */
		page: integer().notNull().default(0),
		/** The page, until it is done; from then on whatever kept it points at it. */
		fileId: fileRef(),
		/** The hold of the process at it, which loses it once `dueAt` passed. */
		heldBy: text(),
		/** How often it was begun. */
		attempts: integer().notNull().default(0),
		/** From then on it is to be done: later while a process has it, or after it failed. */
		dueAt: timestamp({ precision: 3 }).notNull(),
		doneAt: timestamp({ precision: 3 }),
		/** What there is to tell of it, once done (`PageResult`). */
		result: jsonb().$type<Omit<PageResult, 'page'>>()
	},
	(table) => [
		uniqueIndex('scan_task_delivery_id_kind_page_key').on(table.deliveryId, table.kind, table.page),
		index('scan_task_due_at_idx').on(table.dueAt).where(isNull(table.doneAt)),
		index('scan_task_file_id_idx').on(table.fileId)
	]
);
