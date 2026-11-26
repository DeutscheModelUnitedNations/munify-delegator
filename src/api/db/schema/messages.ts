import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	boolean,
	index,
	integer,
	uniqueIndex,
	check,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndCreatedAt, defaultIdAndTimestamps } from './helpers';
import { user } from './users';
import { conferenceRef } from './conference';
import { conferenceParticipant } from './participants';
import { delegation } from './application';
import { committee } from './committees';
import { teamMember } from './team';
import { paper } from './papers';
import { conferenceRole } from './roles';

/** The messages people of a conference write each other inside the app. */

/**
 * What a team member does next to their team role. In a committee: chairing it, or advising its
 * delegates on the content; each function of a committee shares one inbox (`chat.inbox`) and is in
 * the committee's group. For a custom role (`ROLE_SUPPORT`, "Betreuung"): looking after the people
 * holding it (the press, say), in its inbox and its group. For the whole conference, without a
 * committee or role: being a trusted person, whom participants turn to in confidence, together or
 * one of them alone.
 */
export const teamFunctionKind = pgEnum('team_function_kind', [
	'CHAIR',
	'CONSULTANT',
	'TRUSTED_PERSON',
	'ROLE_SUPPORT'
]);

export const teamFunction = snakeCase.table(
	'team_function',
	{
		...defaultIdAndTimestamps,
		teamMemberId: text()
			.notNull()
			.references(() => teamMember.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** The committee of a chair or consultant; empty for a trusted person. */
		committeeId: text().references(() => committee.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/** The custom role a `ROLE_SUPPORT` looks after; empty for every other function. */
		roleId: text().references(() => conferenceRole.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		kind: teamFunctionKind().notNull()
	},
	(table) => [
		// a function without a committee or role (a trusted person) is held once
		uniqueIndex('team_function_team_member_id_kind_key')
			.on(table.teamMemberId, table.kind)
			.where(sql`${table.committeeId} is null and ${table.roleId} is null`),
		uniqueIndex('team_function_team_member_id_role_id_kind_key')
			.on(table.teamMemberId, table.roleId, table.kind)
			.where(sql`${table.roleId} is not null`),
		index('team_function_role_id_idx').on(table.roleId),
		uniqueIndex('team_function_team_member_id_committee_id_kind_key').on(
			table.teamMemberId,
			table.committeeId,
			table.kind
		),
		index('team_function_committee_id_idx').on(table.committeeId),
		// what a notification preference of a function points at (`notification_preference`)
		uniqueIndex('team_function_id_team_member_id_key').on(table.id, table.teamMemberId)
	]
);

/**
 * `DIRECT`: two participants. `DELEGATION`: everybody of one delegation. `TEAM`: one participant
 * and a team inbox, which everybody holding it reads and answers. `COMMITTEE`: the group of
 * everybody seated in a committee with its chairs and consultants. `ROLE`: the group of everybody
 * holding a custom role with the team members looking after it (`ROLE_SUPPORT`).
 */
export const chatKind = pgEnum('chat_kind', ['DIRECT', 'DELEGATION', 'TEAM', 'COMMITTEE', 'ROLE']);

/**
 * The team inboxes: participant care (one per conference), a committee's chairs or consultants,
 * the trusted persons: all of them together, or one of them alone (`chat.trustedUserId`), and the
 * team members looking after a custom role (`ROLE_SUPPORT`, with `chat.roleId`).
 */
export const chatInbox = pgEnum('chat_inbox', [
	'PARTICIPANT_CARE',
	'CHAIR',
	'CONSULTANT',
	'TRUSTED_PERSON',
	'ROLE_SUPPORT'
]);

function participantOfChat() {
	return text().references(() => conferenceParticipant.id, {
		onDelete: 'cascade',
		onUpdate: 'cascade'
	});
}

export const chat = snakeCase.table(
	'chat',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		kind: chatKind().notNull(),
		/** `DIRECT`: the party with the smaller id. `TEAM`: the participant. */
		participantId: participantOfChat(),
		/** `DIRECT`: the party with the larger id. */
		otherParticipantId: participantOfChat(),
		/** `DELEGATION`: whose group this is. */
		delegationId: text().references(() => delegation.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/** `TEAM`: the inbox, with its committee or role unless it is participant care. */
		inbox: chatInbox(),
		/** `TEAM`: the committee of a chairs' or consultants' inbox. `COMMITTEE`: whose group this is. */
		committeeId: text().references(() => committee.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/** `TEAM`: the custom role of a `ROLE_SUPPORT` inbox. `ROLE`: whose group this is. */
		roleId: text().references(() => conferenceRole.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/**
		 * `TEAM`, the trusted persons' inbox: the one trusted person the participant writes to;
		 * empty for all of them together. Deliberately no relation: a chat never leads to a user row.
		 */
		trustedUserId: text().references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		lastMessageAt: timestamp({ precision: 3 }),
		/** `TEAM`: when the participant last wrote, which the inbox's unread state follows. */
		lastParticipantMessageAt: timestamp({ precision: 3 }),
		/** `TEAM`: when somebody holding the inbox last read the chat; the inbox shares it. */
		teamReadAt: timestamp({ precision: 3 }),
		/**
		 * `TEAM`: when somebody holding the inbox put the chat away into the archive, for everybody
		 * holding it; emptied by the next message, which brings the chat back.
		 */
		teamArchivedAt: timestamp({ precision: 3 }),
		/** While a report is open participant care reads the chat (`chatReport`). */
		underReview: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('chat_direct_key')
			.on(table.participantId, table.otherParticipantId)
			.where(sql`${table.kind} = 'DIRECT'`),
		uniqueIndex('chat_delegation_key')
			.on(table.delegationId)
			.where(sql`${table.kind} = 'DELEGATION'`),
		uniqueIndex('chat_team_care_key')
			.on(table.participantId)
			.where(sql`${table.kind} = 'TEAM' and ${table.inbox} = 'PARTICIPANT_CARE'`),
		uniqueIndex('chat_team_committee_key')
			.on(table.participantId, table.inbox, table.committeeId)
			.where(sql`${table.kind} = 'TEAM' and ${table.inbox} in ('CHAIR', 'CONSULTANT')`),
		// the trusted persons' inboxes name no committee: one chat with all of them, one with each
		uniqueIndex('chat_team_trusted_key')
			.on(table.participantId)
			.where(
				sql`${table.kind} = 'TEAM' and ${table.inbox} = 'TRUSTED_PERSON' and ${table.trustedUserId} is null`
			),
		// a team chat naming a role is that role's inbox (the conditions name only values the enums
		// had before the groups: a new value cannot be used in the transaction that adds it)
		uniqueIndex('chat_team_role_key')
			.on(table.participantId, table.roleId)
			.where(sql`${table.kind} = 'TEAM' and ${table.roleId} is not null`),
		// besides a team chat only the committee's and role's group name one
		uniqueIndex('chat_committee_key')
			.on(table.committeeId)
			.where(sql`${table.kind} <> 'TEAM' and ${table.committeeId} is not null`),
		uniqueIndex('chat_role_key')
			.on(table.roleId)
			.where(sql`${table.kind} <> 'TEAM' and ${table.roleId} is not null`),
		index('chat_role_id_idx').on(table.roleId),
		uniqueIndex('chat_team_trusted_person_key')
			.on(table.participantId, table.trustedUserId)
			.where(sql`${table.trustedUserId} is not null`),
		index('chat_conference_id_last_message_at_idx').on(table.conferenceId, table.lastMessageAt),
		index('chat_other_participant_id_idx').on(table.otherParticipantId)
	]
);

/** One message. Append-only. */
export const chatMessage = snakeCase.table(
	'chat_message',
	{
		...defaultIdAndCreatedAt,
		chatId: text()
			.notNull()
			.references(() => chat.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/**
		 * The author's part in the conference, which is all the parties of a direct chat learn of
		 * each other; empty for a message from the team.
		 */
		authorParticipantId: text().references(() => conferenceParticipant.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		/** The team member who wrote a message from an inbox. */
		teamAuthorUserId: text().references(() => user.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		/** Written from the inbox of a `TEAM` chat. */
		fromTeam: boolean().default(false).notNull(),
		body: text().notNull(),
		/** The paper the message is about, when it was written from one. */
		paperId: text().references(() => paper.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		/**
		 * When participant care hid the message for everybody of the chat, while reviewing a report.
		 * Final: the text stays for the record (participant care and system admins read it), the
		 * parties see a placeholder. Neither the text nor the hiding changes afterwards
		 * (`chat_message_hidden_is_final`).
		 */
		hiddenAt: timestamp({ precision: 3 }),
		/** Who of participant care hid it. */
		hiddenById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		/** Why, for the team only. Set together with `hiddenAt` (`chat_message_hidden_reason`). */
		hiddenReason: text(),
		/** The report under which it was hidden: the oldest one open then. */
		hiddenReportId: text().references((): AnyPgColumn => chatReport.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		index('chat_message_chat_id_created_at_idx').on(table.chatId, table.createdAt),
		index('chat_message_hidden_report_id_idx').on(table.hiddenReportId),
		check(
			'chat_message_hidden_reason',
			sql`(${table.hiddenAt} is null) = (${table.hiddenReason} is null)`
		)
	]
);

/** A chat and a person: who read it up to when, who muted it. */
function chatAndPerson() {
	return {
		chatId: text()
			.notNull()
			.references(() => chat.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	};
}

/** Up to when a person has read a chat. The team side of a `TEAM` chat is `chat.teamReadAt`. */
export const chatRead = snakeCase.table(
	'chat_read',
	{
		...defaultIdAndTimestamps,
		...chatAndPerson(),
		readAt: timestamp({ precision: 3 }).notNull()
	},
	(table) => [uniqueIndex('chat_read_chat_id_user_id_key').on(table.chatId, table.userId)]
);

/**
 * Somebody who muted a group (`COMMITTEE`, `ROLE`) for themselves: it counts nothing unread for
 * them and sends them no mail. They stay in it and keep reading.
 */
export const chatMute = snakeCase.table(
	'chat_mute',
	{
		...defaultIdAndCreatedAt,
		...chatAndPerson()
	},
	(table) => [
		uniqueIndex('chat_mute_chat_id_user_id_key').on(table.chatId, table.userId),
		index('chat_mute_user_id_idx').on(table.userId)
	]
);

/** A participant who does not want to hear from another: neither can write the other directly. */
export const chatBlock = snakeCase.table(
	'chat_block',
	{
		...defaultIdAndCreatedAt,
		blockerParticipantId: text()
			.notNull()
			.references(() => conferenceParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		blockedParticipantId: text()
			.notNull()
			.references(() => conferenceParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('chat_block_blocker_blocked_key').on(
			table.blockerParticipantId,
			table.blockedParticipantId
		),
		index('chat_block_blocked_participant_id_idx').on(table.blockedParticipantId)
	]
);

export const chatReportStatus = pgEnum('chat_report_status', ['OPEN', 'RESOLVED']);

/** Someone asking participant care to look at a chat. */
export const chatReport = snakeCase.table(
	'chat_report',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		chatId: text()
			.notNull()
			.references(() => chat.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		reporterUserId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		reason: text().notNull(),
		status: chatReportStatus().default('OPEN').notNull(),
		resolvedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		resolvedAt: timestamp({ precision: 3 }),
		/** What participant care noted when settling it: for the team only. */
		resolutionNote: text()
	},
	(table) => [index('chat_report_conference_id_status_idx').on(table.conferenceId, table.status)]
);

/**
 * Somebody agreeing to the message service's terms (`#api/handlers/messagingTerms/`), once for
 * every conference: the version and revision they were shown, in which locale, the hash of exactly
 * that text, and the confirmations they ticked. Rows are only ever added; whether one still holds
 * is `acceptanceHolds`. Agreements given before this table existed carry neither locale nor hash.
 * No relation and no ability on purpose: nothing in the API reads these rows.
 */
export const messagingTermsAcceptance = snakeCase.table(
	'messaging_terms_acceptance',
	{
		...defaultIdAndCreatedAt,
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		version: integer().notNull(),
		revision: integer().notNull(),
		locale: text(),
		contentHash: text(),
		confirmationIds: text().array().notNull()
	},
	(table) => [
		uniqueIndex('messaging_terms_acceptance_user_id_version_revision_key').on(
			table.userId,
			table.version,
			table.revision
		)
	]
);
