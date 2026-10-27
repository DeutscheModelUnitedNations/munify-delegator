import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	boolean,
	integer,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { conferenceRef } from './conference';
import { userRef } from './users';

/** The automatic mails to participants and supervisors, what each conference sends, and what was sent. */

/** Every kind of automatic mail; `#lib/helpers/emailKinds.ts` describes them. */
export const emailKind = pgEnum('email_kind', [
	'ASSIGNMENT_ACCEPTED',
	'ASSIGNMENT_REJECTED',
	'SUPERVISOR_ASSIGNMENT_SUMMARY',
	'WAITING_LIST_SEATED',
	'POSTAL_UNLOCKED',
	'PAYMENT_UNLOCKED',
	'POSTAL_RECEIVED',
	'PAYMENT_RECEIVED',
	'PAPERWORK_PROBLEM',
	'APPLICATION_DEADLINE_REMINDER',
	'OPEN_ISSUES_REMINDER',
	'PHONE_READY_REMINDER',
	'SURVEY_REMINDER',
	'CERTIFICATE_AVAILABLE',
	'SUPERVISOR_STUDENT_LINKED',
	'PAPER_REVIEWED',
	'TEAM_INVITATION',
	'TEAM_WELCOME'
]);

/**
 * `SENDING` while a sweep holds the mail, `SENT` and `FAILED` after it, and `SKIPPED` for what the
 * team chose not to send when it switched a kind on (`notifyExisting: false`).
 */
export const emailStatus = pgEnum('email_status', ['SENDING', 'SENT', 'FAILED', 'SKIPPED']);

/** Which automatic mails a conference sends. A kind without a row is off. */
export const conferenceEmailSetting = snakeCase.table(
	'conference_email_setting',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		kind: emailKind().notNull(),
		enabled: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('conference_email_setting_conference_id_kind_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.kind.asc().nullsLast()
		)
	]
);

/**
 * A conference's own text for one kind of automatic mail in one language. Only what the team
 * changed is stored: a field left null keeps the default text (`#lib/helpers/emailTemplates.ts`),
 * and so follows when that improves.
 */
export const conferenceEmailText = snakeCase.table(
	'conference_email_text',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		kind: emailKind().notNull(),
		/** A Paraglide locale (`de`, `en`): mails are written in the recipient's. */
		locale: text().notNull(),
		subject: text(),
		heading: text(),
		/** Paragraphs separated by a blank line, with `{placeholders}`. */
		body: text()
	},
	(table) => [
		uniqueIndex('conference_email_text_conference_id_kind_locale_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.kind.asc().nullsLast(),
			table.locale.asc().nullsLast()
		)
	]
);

/**
 * A conference's footer for every mail it sends, in one language: a signature, contact details,
 * whatever the team wants under each mail. A language without a row has none.
 */
export const conferenceEmailFooter = snakeCase.table(
	'conference_email_footer',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		/** A Paraglide locale (`de`, `en`): mails are written in the recipient's. */
		locale: text().notNull(),
		/** Paragraphs separated by a blank line; `{conference}` is the conference's name. */
		text: text().notNull()
	},
	(table) => [
		uniqueIndex('conference_email_footer_conference_id_locale_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.locale.asc().nullsLast()
		)
	]
);

/**
 * One automatic mail to one person. The row is written before the mail goes out and is unique per
 * conference, kind, person and `subjectKey` (what the mail is about: a role, a status, a student),
 * so a mail is sent once however often the sweep runs, on however many instances.
 */
export const emailLog = snakeCase.table(
	'email_log',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		kind: emailKind().notNull(),
		userId: userRef('cascade'),
		subjectKey: text().notNull(),
		status: emailStatus().default('SENDING').notNull(),
		/** The address the mail went to, as it was then. */
		email: text(),
		attempts: integer().default(0).notNull(),
		error: text(),
		sentAt: timestamp({ precision: 3 })
	},
	(table) => [
		uniqueIndex('email_log_conference_id_kind_user_id_subject_key_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.kind.asc().nullsLast(),
			table.userId.asc().nullsLast(),
			table.subjectKey.asc().nullsLast()
		),
		index('email_log_conference_id_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.createdAt.desc().nullsLast()
		)
	]
);
