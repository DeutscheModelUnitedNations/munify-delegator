import {
	snakeCase,
	text,
	integer,
	boolean,
	index,
	uniqueIndex,
	timestamp
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, implicitManyToMany, trigramIndex } from './helpers';
import { userRef } from './users';
import { conferenceRef } from './conference';
import { committee } from './committees';
import { conferenceRole } from './roles';
import { participantRef } from './participants';
import { schoolRef } from './schools';

/** Registrations: delegations, their members, single participants and their wishes. */

/**
 * What a delegation or a single participant applied with, and whether they sent it. `applied`
 * is the step from registering to applying; the texts are the application's. The school is not
 * among them: it is each person's own (`conferenceParticipant.schoolId`).
 */
const applicationColumns = () => ({
	applied: boolean().default(false).notNull(),
	motivation: text(),
	experience: text()
});

export const delegation = snakeCase.table(
	'delegation',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		entryCode: text().notNull(),
		...applicationColumns(),
		/** A nation or non-state actor. */
		assignedRoleId: text().references(() => conferenceRole.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		/**
		 * How many members the delegation has. Kept by a trigger on `delegation_member` (see the
		 * `delegation_member_count` migration), so the assignment board can ask for the delegations
		 * of one group size instead of reading them all.
		 */
		memberCount: integer().default(0).notNull()
	},
	(table) => [
		// The assignment board's pool: the delegations of one size in a conference.
		index('delegation_conference_id_member_count_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.memberCount.asc().nullsLast()
		),
		// A role belongs to one conference, so this is one delegation per role and conference.
		uniqueIndex('delegation_assigned_role_id_key').using(
			'btree',
			table.assignedRoleId.asc().nullsLast()
		),
		uniqueIndex('delegation_conference_id_entry_code_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.entryCode.asc().nullsLast()
		),
		// rumble's `search` argument; see `trigramIndex`.
		trigramIndex({ name: 'delegation_id_trgm', column: table.id }),
		// The management tables search these with `ilike '%word%'`, which the same indexes serve.
		trigramIndex({ name: 'delegation_entry_code_trgm', column: table.entryCode }),
		trigramIndex({ name: 'delegation_motivation_trgm', column: table.motivation }),
		trigramIndex({ name: 'delegation_experience_trgm', column: table.experience }),
		// paging through a conference's delegations, newest first
		index('delegation_conference_id_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.createdAt.desc().nullsLast()
		)
	]
);

export const delegationMember = snakeCase.table(
	'delegation_member',
	{
		...defaultIdAndTimestamps,
		delegationId: text()
			.notNull()
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** Who the member is; the delegation and this row are in the same conference (trigger). */
		conferenceParticipantId: participantRef(),
		isHeadDelegate: boolean().notNull(),
		assignedCommitteeId: text().references(() => committee.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		// a delegation's members: the relation, the member counts and the cascade from the delegation
		index('delegation_member_delegation_id_idx').using(
			'btree',
			table.delegationId.asc().nullsLast()
		),
		// One membership per person and conference: the participant row is per person and conference.
		uniqueIndex('delegation_member_conference_participant_id_key').using(
			'btree',
			table.conferenceParticipantId.asc().nullsLast()
		)
	]
);

export const singleParticipant = snakeCase.table(
	'single_participant',
	{
		...defaultIdAndTimestamps,
		/** Who applies; it says which conference and who. */
		conferenceParticipantId: participantRef(),
		...applicationColumns(),
		/** A custom role. */
		assignedRoleId: text().references(() => conferenceRole.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		// One single registration per person and conference.
		uniqueIndex('single_participant_conference_participant_id_key').using(
			'btree',
			table.conferenceParticipantId.asc().nullsLast()
		),
		trigramIndex({ name: 'single_participant_id_trgm', column: table.id }),
		trigramIndex({ name: 'single_participant_motivation_trgm', column: table.motivation }),
		trigramIndex({ name: 'single_participant_experience_trgm', column: table.experience })
	]
);

/** The custom roles a single participant applies for (`a` the role, `b` the participant). */
export const singleParticipantRoleWish = implicitManyToMany({
	name: 'single_participant_role_wish',
	a: () => conferenceRole.id,
	b: () => singleParticipant.id
});

export const roleApplication = snakeCase.table(
	'role_application',
	{
		...defaultIdAndTimestamps,
		/** A nation or non-state actor. A wish goes with its role. */
		roleId: text()
			.notNull()
			.references(() => conferenceRole.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		rank: integer().notNull(),
		delegationId: text()
			.notNull()
			.references(() => delegation.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('role_application_delegation_id_role_id_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.roleId.asc().nullsLast()
		),
		index('role_application_role_id_idx').using('btree', table.roleId.asc().nullsLast()),
		uniqueIndex('role_application_delegation_id_rank_key').using(
			'btree',
			table.delegationId.asc().nullsLast(),
			table.rank.asc().nullsLast()
		)
	]
);

export const waitingListEntry = snakeCase.table(
	'waiting_list_entry',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		userId: userRef('restrict'),
		schoolId: schoolRef(),
		experience: text().notNull(),
		motivation: text().notNull(),
		requests: text(),
		/** When the entrant was given a seat; empty while they wait. */
		assignedAt: timestamp({ precision: 3 }),
		hidden: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('waiting_list_entry_conference_id_user_id_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.userId.asc().nullsLast()
		),
		index('waiting_list_entry_school_id_idx').using('btree', table.schoolId.asc().nullsLast()),
		trigramIndex({ name: 'waiting_list_entry_experience_trgm', column: table.experience }),
		trigramIndex({ name: 'waiting_list_entry_motivation_trgm', column: table.motivation }),
		trigramIndex({ name: 'waiting_list_entry_requests_trgm', column: table.requests }),
		index('waiting_list_entry_conference_id_assigned_at_created_at_idx').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.assignedAt.asc().nullsLast(),
			table.createdAt.asc().nullsLast()
		)
	]
);
