import { snakeCase, pgEnum, text, integer } from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { conferenceRef } from './conference';

/** Committees and their agenda items. */

/** What the regional distribution of a committee's seats is compared to in the seat planning. */
export const regionalBaseline = pgEnum('regional_baseline', [
	'UN_MEMBERS',
	'HUMAN_RIGHTS_COUNCIL',
	'ECOSOC',
	'SECURITY_COUNCIL',
	'MANUAL'
]);

/** Whether an agenda item's papers need more reviewers, as the paper reviewers mark it. */
export const reviewHelpStatus = pgEnum('review_help_status', [
	'UNSPECIFIED',
	'HELP_NEEDED',
	'NO_HELP_WANTED'
]);

export const committee = snakeCase.table('committee', {
	...defaultIdAndTimestamps,
	name: text().notNull(),
	abbreviation: text().notNull(),
	conferenceId: conferenceRef('cascade'),
	numOfSeatsPerDelegation: integer().default(1).notNull(),
	resolutionHeadline: text(),
	regionalBaseline: regionalBaseline().default('UN_MEMBERS').notNull(),
	/**
	 * Target seats per UN regional group for the MANUAL baseline, in the order African,
	 * Asia-Pacific, Eastern European, Latin American and Caribbean, Western European and Others.
	 * Kept when switching to a template, so switching back restores them.
	 */
	regionalBaselineTargets: integer().array().default([]).notNull()
});

export const committeeAgendaItem = snakeCase.table('committee_agenda_item', {
	...defaultIdAndTimestamps,
	title: text().notNull(),
	teaserText: text(),
	committeeId: text()
		.notNull()
		.references(() => committee.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	reviewHelpStatus: reviewHelpStatus().default('UNSPECIFIED').notNull()
});
