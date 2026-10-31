import { snakeCase, pgEnum, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps } from './helpers';
import { user, userRef } from './users';
import { conferenceRef } from './conference';

/** A conference's team and the invitations onto it. */

export const teamRole = pgEnum('team_role', [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'MEMBER',
	'REVIEWER',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD'
]);

export const teamMember = snakeCase.table(
	'team_member',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict'),
		role: teamRole().default('MEMBER').notNull()
	},
	(table) => [
		uniqueIndex('team_member_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		)
	]
);

export const teamMemberInvitation = snakeCase.table(
	'team_member_invitation',
	{
		...defaultIdAndTimestamps,
		email: text().notNull(),
		role: teamRole().notNull(),
		token: text().notNull(),
		expiresAt: timestamp({ precision: 3 }).notNull(),
		usedAt: timestamp({ precision: 3 }),
		revokedAt: timestamp({ precision: 3 }),
		conferenceId: conferenceRef('cascade'),
		invitedById: userRef('restrict'),
		acceptedById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [
		index('team_member_invitation_conference_id_email_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.email.asc().nullsLast()
		),
		uniqueIndex('team_member_invitation_conference_id_email_pending_key')
			.using('btree', table.conferenceId.asc().nullsLast(), table.email.asc().nullsLast())
			.where(sql`(("usedAt" IS NULL) AND ("revokedAt" IS NULL))`),
		index('team_member_invitation_conference_id_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast()
		),
		index('team_member_invitation_token_idx').using('btree', table.token.asc().nullsLast()),
		uniqueIndex('team_member_invitation_token_key').using('btree', table.token.asc().nullsLast())
	]
);

/**
 * The results a team member picked in the global search (or scanned), on any of their devices.
 * The newest few are offered again when the search opens empty, and a fresh one is offered to the
 * person's other devices for a moment. `originId` names the browser tab that made it, so that tab
 * does not offer it to itself. What was typed is not kept. Useful if a person is scanned on a phone
 * but the user wants to continue on their laptop.
 */
export const searchHistory = snakeCase.table(
	'search_history',
	{
		...defaultIdAndTimestamps,
		userId: userRef('cascade'),
		conferenceId: conferenceRef('cascade'),
		originId: text().notNull(),
		/** The id of the result that was picked: a person, a delegation, a seat, anything. */
		resultId: text().notNull(),
		/** How the result was named when it was picked, as the list shows it. */
		label: text().notNull()
	},
	(table) => [index('search_history_user_id_idx').using('btree', table.userId.asc().nullsLast())]
);
