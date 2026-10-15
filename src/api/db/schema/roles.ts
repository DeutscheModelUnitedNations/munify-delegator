import { snakeCase, pgEnum, text, integer, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps, defaultTimestamps, implicitManyToMany } from './helpers';
import { conferenceRef } from './conference';
import { committee } from './committees';

/** The roles a conference offers: nations, non-state actors and custom roles. */

export const nation = snakeCase.table(
	'nation',
	{
		alpha3Code: text().primaryKey(),
		alpha2Code: text().notNull(),
		...defaultTimestamps
	},
	(table) => [
		uniqueIndex('nation_alpha2_code_key').using('btree', table.alpha2Code.asc().nullsLast())
	]
);

export const conferenceRoleKind = pgEnum('conference_role_kind', [
	'NATION',
	'NON_STATE_ACTOR',
	'CUSTOM'
]);

/**
 * A role a conference offers: a nation, a non-state actor or a custom role for single
 * participants. Everything that names a role - an assignment, a wish, a draft - points here, so a
 * role is one foreign key wherever it is used, and that key also says which conference it is in.
 *
 * Nations are global reference data; a conference offers one by seating it in a committee, and
 * `setCommitteeNationSeat` keeps a `NATION` row for every nation that has a seat. Such a row only
 * holds `nationAlpha3Code`: its name is the nation's translated one and its seats come from the
 * committees. Non-state actors and custom roles carry their own name, description and seats.
 * `$lib/helpers/conferenceRole` counts a role's seats and narrows a row to its kind.
 */
export const conferenceRole = snakeCase.table(
	'conference_role',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		kind: conferenceRoleKind().notNull(),
		nationAlpha3Code: text().references(() => nation.alpha3Code, {
			onDelete: 'restrict',
			onUpdate: 'cascade'
		}),
		name: text(),
		/** Only non-state actors have one. */
		abbreviation: text(),
		description: text(),
		fontAwesomeIcon: text(),
		/** How many people the role seats: a non-state actor's delegation size, a custom role's places. */
		seatAmount: integer()
	},
	(table) => [
		index('conference_role_conference_id_idx').using('btree', table.conferenceId.asc().nullsLast()),
		uniqueIndex('conference_role_conference_id_nation_alpha3_code_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.nationAlpha3Code.asc().nullsLast()
		),
		uniqueIndex('conference_role_conference_id_kind_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.kind.asc().nullsLast(),
			table.name.asc().nullsLast()
		),
		uniqueIndex('conference_role_conference_id_abbreviation_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.abbreviation.asc().nullsLast()
		),
		check(
			'conference_role_nation_shape',
			sql`(${table.kind} = 'NATION') = (${table.nationAlpha3Code} is not null)
				and (${table.kind} = 'NATION') = (${table.name} is null)
				and (${table.kind} = 'NATION') = (${table.description} is null)
				and (${table.kind} = 'NATION') = (${table.seatAmount} is null)`
		),
		check(
			'conference_role_abbreviation',
			sql`(${table.kind} = 'NON_STATE_ACTOR') = (${table.abbreviation} is not null)`
		)
	]
);

/** The nation roles a committee seats. Only `NATION` rows belong here. */
export const committeeToRole = implicitManyToMany(
	'committee_to_role',
	() => committee.id,
	() => conferenceRole.id
);
