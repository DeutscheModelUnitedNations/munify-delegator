import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	boolean,
	integer,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndCreatedAt, defaultIdAndTimestamps } from './helpers';
import { user } from './users';
import { conferenceRef } from './conference';
import { committee } from './committees';
import { conferenceRole } from './roles';
import { surveyOption } from './surveys';
import { teamRole } from './team';
import { fileRef } from './storedFile';

/** What the team tells the people of its conference: announcements, each for its own audience. */

/** How loud an announcement is: an urgent one follows its readers across the conference's pages. */
export const announcementImportance = pgEnum('announcement_importance', [
	'NORMAL',
	'IMPORTANT',
	'URGENT'
]);

/**
 * `DRAFT`: only its editors see it. `PUBLISHED`: its audience reads it from `publishAt` on (a time
 * ahead schedules it) until `visibleUntil`. `ARCHIVED`: taken down, kept for the team.
 */
export const announcementStatus = pgEnum('announcement_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const announcement = snakeCase.table(
	'announcement',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		title: text().notNull(),
		/** Markdown. */
		body: text().notNull(),
		importance: announcementImportance().default('NORMAL').notNull(),
		/** Stays on top of the feed. */
		pinned: boolean().default(false).notNull(),
		/** The line under the text that says who is speaking ("Your participant care team"). */
		signature: text(),
		status: announcementStatus().default('DRAFT').notNull(),
		/** From when the audience reads it; set when it is published, ahead for a scheduled one. */
		publishAt: timestamp({ precision: 3 }),
		/** The audience stops seeing it then. */
		visibleUntil: timestamp({ precision: 3 }),
		/** When title or text last changed after the audience could read it. */
		editedAt: timestamp({ precision: 3 }),
		/** Whether its audience is told by mail (`ANNOUNCEMENT`). */
		notifyByMail: boolean().default(false).notNull(),
		/**
		 * From when the mail is owed: the publication, or the last "notify again". The mail is owed
		 * for `ANNOUNCEMENT_MAIL_HOURS` from then on.
		 */
		mailSince: timestamp({ precision: 3 }),
		/** Counts the "notify again"s: part of the mail's key, so each one sends once more. */
		mailRevision: integer().default(0).notNull(),
		/**
		 * Whether open pages were told that it is out. Publishing right away sets it; a scheduled one
		 * is announced by the `send-emails` job once its time has come.
		 */
		releaseAnnounced: boolean().default(false).notNull(),
		authorId: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		publishedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [
		index('announcement_conference_id_status_publish_at_idx').on(
			table.conferenceId,
			table.status,
			table.publishAt
		)
	]
);

/**
 * Who an announcement is for. An announcement names any number of these, and whoever matches one
 * of them reads it (`#lib/helpers/announcementAudience`). The kinds about a seat (a committee, a
 * role, `SEATED`, open paperwork) match participants only once the assignment is released.
 */
export const announcementAudienceKind = pgEnum('announcement_audience_kind', [
	/**
	 * Every participant: delegates, single participants, supervisors and the waiting list. Once
	 * the conference prepares and its assignment is released, only those with a part in it: who
	 * holds a seat, and the supervisors of somebody who does.
	 */
	'EVERYONE',
	'DELEGATES',
	'SINGLE_PARTICIPANTS',
	'SUPERVISORS',
	/** Delegates and single participants without a seat. */
	'APPLICANTS',
	/** Whoever holds a seat, and the supervisors coming along. */
	'SEATED',
	'WAITING_LIST',
	/** The team; with `teamRole` only that role. */
	'TEAM',
	/** The delegates seated in `committeeId`. */
	'COMMITTEE',
	/** Whoever holds `roleId`: a nation, a non-state actor or a custom role. */
	'ROLE',
	/** Whoever picked `surveyOptionId`. */
	'SURVEY_OPTION',
	'PAYMENT_OPEN',
	'PAPERWORK_OPEN',
	/** Under and of age on the first day of the conference. */
	'MINORS',
	'ADULTS'
]);

export const announcementAudience = snakeCase.table(
	'announcement_audience',
	{
		...defaultIdAndCreatedAt,
		announcementId: text()
			.notNull()
			.references(() => announcement.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		kind: announcementAudienceKind().notNull(),
		committeeId: text().references(() => committee.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		roleId: text().references(() => conferenceRole.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		surveyOptionId: text().references(() => surveyOption.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		teamRole: teamRole()
	},
	(table) => [index('announcement_audience_announcement_id_idx').on(table.announcementId)]
);

/** A file that comes with an announcement, in the order they are listed. */
export const announcementAttachment = snakeCase.table(
	'announcement_attachment',
	{
		...defaultIdAndCreatedAt,
		announcementId: text()
			.notNull()
			.references(() => announcement.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		fileId: fileRef().notNull(),
		position: integer().default(0).notNull()
	},
	(table) => [index('announcement_attachment_announcement_id_idx').on(table.announcementId)]
);

/** Who has read an announcement. */
export const announcementRead = snakeCase.table(
	'announcement_read',
	{
		...defaultIdAndCreatedAt,
		announcementId: text()
			.notNull()
			.references(() => announcement.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('announcement_read_announcement_id_user_id_key').on(
			table.announcementId,
			table.userId
		),
		index('announcement_read_user_id_idx').on(table.userId)
	]
);
