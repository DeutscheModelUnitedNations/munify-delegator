import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	boolean,
	index,
	unique,
	uniqueIndex,
	foreignKey,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndCreatedAt, defaultIdAndTimestamps, defaultTimestamps } from './helpers';
import { userRef } from './users';
import { conferenceRef } from './conference';
import { teamMember } from './team';
import { teamFunction } from './messages';

/**
 * How the team hears of what waits for it in the app: by mail, or as a direct message from the
 * conference's Slack workspace. Each team member decides per topic (`notificationPreference`).
 */

export const notificationChannel = pgEnum('notification_channel', ['EMAIL', 'SLACK']);

/**
 * What a team member can be told about: the inboxes they answer (participant care; a committee's
 * chairs or consultants, one per function they hold; the trusted persons together, and the chats
 * written to them alone), for participant care a chat being reported, and for a committee's chairs
 * and consultants on the paper team the papers submitted there (one per function they hold); and
 * for participant care what their own scanner delivered and could not be matched to anybody.
 */
export const notificationTopic = pgEnum('notification_topic', [
	'PARTICIPANT_CARE',
	'COMMITTEE_INBOX',
	'TRUSTED_SHARED',
	'TRUSTED_PERSONAL',
	'CHAT_REPORT',
	'COMMITTEE_PAPERS',
	'SCAN_PROBLEM'
]);

/**
 * A Slack workspace the app can write into, with its bot's token (encrypted, `slackToken.ts`).
 * System admins keep the list; a conference picks one (`conferenceSlackWorkspace`), so one token
 * serves every conference of an organizer.
 */
export const slackWorkspace = snakeCase.table(
	'slack_workspace',
	{
		...defaultIdAndTimestamps,
		/** What the app calls it ("MUN-SH"). */
		name: text().notNull(),
		/** Slack's id and name of the workspace, as the token answered `auth.test`. */
		slackTeamId: text().notNull(),
		slackTeamName: text().notNull(),
		botTokenCiphertext: text().notNull()
	},
	(table) => [uniqueIndex('slack_workspace_slack_team_id_key').on(table.slackTeamId)]
);

/** The workspace a conference's team is told in. Without a row the conference has no Slack. */
export const conferenceSlackWorkspace = snakeCase.table('conference_slack_workspace', {
	conferenceId: conferenceRef('cascade').primaryKey(),
	slackWorkspaceId: text()
		.notNull()
		.references(() => slackWorkspace.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	...defaultTimestamps
});

/**
 * A team member's choice for one topic and channel. Only choices are stored: without a row the
 * default holds (`#lib/helpers/teamNotifications`). A committee's inbox and papers are the
 * member's function there, which the composite key keeps theirs.
 */
export const notificationPreference = snakeCase.table(
	'notification_preference',
	{
		...defaultIdAndTimestamps,
		teamMemberId: text()
			.notNull()
			.references(() => teamMember.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		topic: notificationTopic().notNull(),
		/**
		 * `COMMITTEE_INBOX` and `COMMITTEE_PAPERS`: the member's function of that committee; empty for
		 * every other topic.
		 */
		teamFunctionId: text(),
		channel: notificationChannel().notNull(),
		enabled: boolean().notNull()
	},
	(table) => [
		unique('notification_preference_key')
			.on(table.teamMemberId, table.topic, table.teamFunctionId, table.channel)
			.nullsNotDistinct(),
		foreignKey({
			name: 'notification_preference_team_function_fkey',
			columns: [table.teamFunctionId, table.teamMemberId],
			foreignColumns: [teamFunction.id, teamFunction.teamMemberId]
		})
			.onDelete('cascade')
			.onUpdate('cascade'),
		// compared as text: a value added to the enum cannot be used in the migration adding it
		check(
			'notification_preference_function_check',
			sql`(${table.topic}::text in ('COMMITTEE_INBOX', 'COMMITTEE_PAPERS')) = (${table.teamFunctionId} is not null)`
		)
	]
);

/**
 * Who a user is in a workspace, as Slack answered for their account's address. Kept so a message
 * does not cost a lookup each time, and asked again once `lookedUpEmail` is no longer their
 * address or the answer is old (`slackUsers.ts`). `slackUserId` empty: the address is unknown there.
 */
export const slackUserLookup = snakeCase.table(
	'slack_user_lookup',
	{
		...defaultIdAndTimestamps,
		slackWorkspaceId: text()
			.notNull()
			.references(() => slackWorkspace.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		userId: userRef('cascade'),
		lookedUpEmail: text().notNull(),
		slackUserId: text(),
		checkedAt: timestamp({ precision: 3 }).notNull()
	},
	(table) => [
		uniqueIndex('slack_user_lookup_workspace_id_user_id_key').on(
			table.slackWorkspaceId,
			table.userId
		)
	]
);

/**
 * A direct message the app sent a team member, so an inbox tells them once until it is read
 * (`slackNotifications.ts`). `subjectId` is the chat message (report, paper version) that set it
 * off; no foreign key, since a log row that outlives its message only means the next one tells again.
 */
export const slackNotification = snakeCase.table(
	'slack_notification',
	{
		...defaultIdAndCreatedAt,
		teamMemberId: text()
			.notNull()
			.references(() => teamMember.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/**
		 * The inbox (`inboxKey` in `#lib/helpers/teamNotifications`), `report` for a report,
		 * `paper:<id>` for a submitted version of a paper, or `scan` for a scanner's delivery.
		 */
		inboxKey: text().notNull(),
		subjectId: text().notNull()
	},
	(table) => [
		index('slack_notification_team_member_id_inbox_key_idx').on(
			table.teamMemberId,
			table.inboxKey,
			table.createdAt
		)
	]
);
