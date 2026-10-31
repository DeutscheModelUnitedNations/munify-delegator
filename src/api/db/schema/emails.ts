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
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps } from './helpers';
import { conferenceRef } from './conference';
import { user } from './users';

/** The mails to participants, supervisors and the team, what each conference sends, and what was sent. */

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

/**
 * `AUTOMATIC` for what the sweep sends, `MANUAL` for what the team sends by hand: a mail sent again
 * from the user card, or a team invitation.
 */
export const emailTrigger = pgEnum('email_trigger', ['AUTOMATIC', 'MANUAL']);

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
 * One mail to one person. An automatic row is written before the mail goes out and is unique per
 * conference, kind, person and `subjectKey` (what the mail is about: a role, a status, a student),
 * so a mail is sent once however often the sweep runs, on however many instances. A manual row is
 * one more send of its own, and a mail sent by hand counts as sent for the sweep (reminders aside).
 */
export const emailLog = snakeCase.table(
	'email_log',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		kind: emailKind().notNull(),
		/** None for a team invitation, which goes to an address; its `subjectKey` is the invitation. */
		userId: text().references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		subjectKey: text().notNull(),
		trigger: emailTrigger().default('AUTOMATIC').notNull(),
		/** Who sent a manual mail. */
		sentById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		status: emailStatus().default('SENDING').notNull(),
		/** The address the mail went to, as it was then. */
		email: text(),
		attempts: integer().default(0).notNull(),
		error: text(),
		sentAt: timestamp({ precision: 3 })
	},
	(table) => [
		uniqueIndex('email_log_conference_id_kind_user_id_subject_key_key')
			.using(
				'btree',
				table.conferenceId.asc().nullsLast(),
				table.kind.asc().nullsLast(),
				table.userId.asc().nullsLast(),
				table.subjectKey.asc().nullsLast()
			)
			.where(sql`${table.trigger} = 'AUTOMATIC'`),
		index('email_log_conference_id_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.createdAt.desc().nullsLast()
		)
	]
);
