import {
	snakeCase,
	pgEnum,
	text,
	doublePrecision,
	boolean,
	index,
	uniqueIndex,
	check
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { sql } from 'drizzle-orm';
import { conferenceRef } from './conference';
import { conferenceRole } from './roles';
import { delegation, delegationMember, singleParticipant } from './registration';

/** The assignment draft the team plans in before applying it. */

export const assignmentMarkEffect = pgEnum('assignment_mark_effect', [
	'WISHES_AND_SEATING',
	'SEATING_ONLY'
]);

export const assignmentExperienceEffect = pgEnum('assignment_experience_effect', [
	'WISHES_AND_SEATING',
	'SEATING_ONLY'
]);

/** How the team rated one application during the sighting. Survives applying the draft. */
export const assignmentReview = snakeCase.table(
	'assignment_review',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		delegationId: text().references(() => delegation.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		singleParticipantId: text().references(() => singleParticipant.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		evaluation: doublePrecision(),
		flagged: boolean().default(false).notNull(),
		disqualified: boolean().default(false).notNull(),
		note: text()
	},
	(table) => [
		uniqueIndex('assignment_review_delegation_id_key').using(
			'btree',
			table.delegationId.asc().nullsLast()
		),
		uniqueIndex('assignment_review_single_participant_id_key').using(
			'btree',
			table.singleParticipantId.asc().nullsLast()
		),
		check(
			'assignment_review_one_application',
			sql`num_nonnulls(${table.delegationId}, ${table.singleParticipantId}) = 1`
		)
	]
);

/**
 * A group of people the draft gives a role (or takes one from): a whole delegation, one part of a
 * split delegation, or a single participant turned into a delegation. A delegation without any
 * unit keeps what it has.
 */
export const assignmentUnit = snakeCase.table(
	'assignment_unit',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		sourceDelegationId: text().references(() => delegation.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		sourceSingleParticipantId: text().references(() => singleParticipant.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		/** The nation or non-state actor the group gets; null takes its role away. */
		roleId: text().references(() => conferenceRole.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		index('assignment_unit_conference_id_idx').using('btree', table.conferenceId.asc().nullsLast()),
		index('assignment_unit_source_delegation_id_idx').using(
			'btree',
			table.sourceDelegationId.asc().nullsLast()
		),
		uniqueIndex('assignment_unit_source_single_participant_id_key').using(
			'btree',
			table.sourceSingleParticipantId.asc().nullsLast()
		),
		check(
			'assignment_unit_one_source',
			sql`num_nonnulls(${table.sourceDelegationId}, ${table.sourceSingleParticipantId}) = 1`
		)
	]
);

/** The members of one part of a split delegation. A unit without members is the whole delegation. */
export const assignmentUnitMember = snakeCase.table(
	'assignment_unit_member',
	{
		...defaultIdAndTimestamps,
		unitId: text()
			.notNull()
			.references(() => assignmentUnit.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		delegationMemberId: text()
			.notNull()
			.references(() => delegationMember.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('assignment_unit_member_delegation_member_id_key').using(
			'btree',
			table.delegationMemberId.asc().nullsLast()
		),
		index('assignment_unit_member_unit_id_idx').using('btree', table.unitId.asc().nullsLast())
	]
);

/** The custom role the draft gives a single participant; `roleId` null takes theirs away. */
export const assignmentSingleRole = snakeCase.table(
	'assignment_single_role',
	{
		...defaultIdAndTimestamps,
		singleParticipantId: text()
			.notNull()
			.references(() => singleParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		roleId: text().references(() => conferenceRole.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		uniqueIndex('assignment_single_role_single_participant_id_key').using(
			'btree',
			table.singleParticipantId.asc().nullsLast()
		)
	]
);

/** The weights the automatic assignment runs with, one row per conference. */
export const assignmentWeights = snakeCase.table(
	'assignment_weights',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('cascade'),
		/** The rating that counts as neutral; unrated applications are treated as having it. */
		nullRating: doublePrecision().default(2.5).notNull(),
		/** How strongly each star above or below the neutral rating moves the cost. */
		ratingFactor: doublePrecision().default(1).notNull(),
		/** What a flag takes off the cost. */
		markBonus: doublePrecision().default(0).notNull(),
		/** Whether a flag also scales the weight of the group's wishes. */
		markEffect: assignmentMarkEffect().default('SEATING_ONLY').notNull(),
		/** What a group of people seated at earlier conferences costs extra; negative rewards it. */
		experienceModifier: doublePrecision().default(0).notNull(),
		/** Whether the modifier also scales the weight of the group's wishes. */
		experienceEffect: assignmentExperienceEffect().default('WISHES_AND_SEATING').notNull()
	},
	(table) => [
		uniqueIndex('assignment_weights_conference_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast()
		)
	]
);
