import { snakeCase, text, timestamp, integer, date, boolean } from 'drizzle-orm/pg-core';
import { foodPreference, gender } from './users';
import { administrativeStatus } from './participants';
import { paperStatus, paperType } from './papers';

/**
 * The statistics dashboard's materialized views, created by hand in the
 * `statistics_materialized_views` migration (which documents each one) and refreshed by
 * `src/api/handlers/statistics/statistics.ts`. `.existing()` keeps drizzle-kit from managing them; a change
 * goes into a new custom migration (`drizzle-kit generate --custom`).
 */
export const statisticsPeople = snakeCase
	.materializedView('statistics_people', {
		conferenceId: text().notNull(),
		kind: text({
			enum: ['DELEGATION_MEMBER', 'SINGLE_PARTICIPANT', 'SUPERVISOR', 'TEAM_MEMBER']
		}).notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		hasNation: boolean().notNull(),
		hasCommittee: boolean().notNull(),
		accepted: boolean().notNull(),
		attends: boolean().notNull(),
		gender: gender(),
		foodPreference: foodPreference(),
		count: integer().notNull()
	})
	.existing();

export const statisticsDelegations = snakeCase
	.materializedView('statistics_delegations', {
		conferenceId: text().notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		delegations: integer().notNull(),
		members: integer().notNull()
	})
	.existing();

/** Delegation members and single participants per school, each counted by their own school. */
export const statisticsSchools = snakeCase
	.materializedView('statistics_schools', {
		conferenceId: text().notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		schoolId: text(),
		school: text(),
		people: integer().notNull()
	})
	.existing();

export const statisticsRegistrationDays = snakeCase
	.materializedView('statistics_registration_days', {
		conferenceId: text().notNull(),
		day: date({ mode: 'string' }).notNull(),
		kind: text({ enum: ['DELEGATION', 'SINGLE_PARTICIPANT', 'SUPERVISOR'] }).notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		registrations: integer().notNull(),
		members: integer().notNull()
	})
	.existing();

export const statisticsRoleApplications = snakeCase
	.materializedView('statistics_role_applications', {
		conferenceId: text().notNull(),
		roleId: text().notNull(),
		name: text().notNull(),
		fontAwesomeIcon: text(),
		total: integer().notNull(),
		applied: integer().notNull()
	})
	.existing();

export const statisticsAges = snakeCase
	.materializedView('statistics_ages', {
		conferenceId: text().notNull(),
		categoryId: text().notNull(),
		categoryType: text({ enum: ['delegationMember', 'singleParticipant'] }).notNull(),
		roleName: text(),
		committeeId: text(),
		committeeName: text(),
		committeeAbbreviation: text(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		age: integer(),
		count: integer().notNull()
	})
	.existing();

export const statisticsAddresses = snakeCase
	.materializedView('statistics_addresses', {
		conferenceId: text().notNull(),
		applied: boolean().notNull(),
		hasRole: boolean().notNull(),
		country: text(),
		zipPrefix: text(),
		count: integer().notNull()
	})
	.existing();

export const statisticsParticipantStatus = snakeCase
	.materializedView('statistics_participant_status', {
		conferenceId: text().notNull(),
		expected: boolean().notNull(),
		hasStatus: boolean().notNull(),
		paymentStatus: administrativeStatus(),
		postalDone: boolean().notNull(),
		postalProblem: boolean().notNull(),
		didAttend: boolean().notNull(),
		count: integer().notNull()
	})
	.existing();

export const statisticsCommitteeFill = snakeCase
	.materializedView('statistics_committee_fill', {
		conferenceId: text().notNull(),
		committeeId: text().notNull(),
		name: text().notNull(),
		abbreviation: text().notNull(),
		totalSeats: integer().notNull(),
		assignedSeats: integer().notNull()
	})
	.existing();

export const statisticsWaitingList = snakeCase
	.materializedView('statistics_waiting_list', {
		conferenceId: text().notNull(),
		hidden: boolean().notNull(),
		assigned: boolean().notNull(),
		count: integer().notNull()
	})
	.existing();

export const statisticsPapers = snakeCase
	.materializedView('statistics_papers', {
		conferenceId: text().notNull(),
		type: paperType().notNull(),
		status: paperStatus().notNull(),
		hasReview: boolean().notNull(),
		committeeId: text(),
		committeeName: text(),
		committeeAbbreviation: text(),
		count: integer().notNull()
	})
	.existing();

export const statisticsRefreshedAt = snakeCase
	.materializedView('statistics_refreshed_at', {
		id: integer().notNull(),
		refreshedAt: timestamp({ precision: 3, withTimezone: true }).notNull()
	})
	.existing();
