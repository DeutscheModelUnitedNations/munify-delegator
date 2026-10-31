import {
	snakeCase,
	text,
	integer,
	doublePrecision,
	boolean,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, trigramIndex } from './helpers';
import { conferenceRef } from './conference';

/**
 * Schools, shared by every conference. Applicants pick one or name a new one, which creates it;
 * the team keeps what it knows about a school (address, contact, notes) on the row.
 */
export const school = snakeCase.table(
	'school',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		street: text(),
		apartment: text(),
		zip: text(),
		city: text(),
		// state, province or prefecture where the country's addresses have one
		region: text(),
		// ISO 3166-1 alpha-3
		country: text(),
		website: text(),
		contactName: text(),
		contactEmail: text(),
		contactPhone: text(),
		/** The team's notes; only the team reads them. */
		notes: text()
	},
	(table) => [
		trigramIndex({ name: 'school_name_trgm', column: table.name }),
		trigramIndex({ name: 'school_city_trgm', column: table.city })
	]
);

/** An optional reference to a school: a row without one names no school. */
export function schoolRef() {
	return text().references(() => school.id, { onDelete: 'set null', onUpdate: 'cascade' });
}

/**
 * A group of schools that most likely are the same school, found by the analysis the cleanup page
 * runs over the schools a conference's applications name. `key` is the group's sorted school ids
 * as JSON, so a rerun finds the row again and keeps the team's decision; a group that gains or
 * loses a school is a new row.
 */
export const schoolSuggestion = snakeCase.table(
	'school_suggestion',
	{
		...defaultIdAndTimestamps,
		key: text().notNull(),
		similarity: doublePrecision().notNull(),
		/** The team decided these are different schools. */
		dismissed: boolean().default(false).notNull(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('school_suggestion_conference_id_key_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.key.asc().nullsLast()
		)
	]
);

/** One school of a suggestion, with how many participants of the conference named it. */
export const schoolSuggestionVariant = snakeCase.table(
	'school_suggestion_variant',
	{
		...defaultIdAndTimestamps,
		schoolId: text()
			.notNull()
			.references(() => school.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		sumParticipants: integer().notNull(),
		suggestionId: text()
			.notNull()
			.references(() => schoolSuggestion.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('school_suggestion_variant_suggestion_id_school_id_key').using(
			'btree',
			table.suggestionId.asc().nullsLast(),
			table.schoolId.asc().nullsLast()
		)
	]
);
