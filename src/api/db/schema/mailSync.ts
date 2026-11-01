import { snakeCase, text, integer, unique } from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';

/** The Listmonk lists the `mail-sync` job keeps (`src/jobs/mailSync/`). */

export const GLOBAL_LIST_TYPES = ['DMUN_NEWSLETTER', 'DMUN_TEAM_TENDERS'] as const;

export const CONFERENCE_LIST_TYPES = [
	'REGISTRATION_NOT_COMPLETED',
	'REGISTRATION_COMPLETED',
	'REJECTED_PARTICIPANTS',
	'DELEGATION_MEMBERS_NATIONS',
	'DELEGATION_MEMBERS_NSA',
	'SINGLE_PARTICIPANTS',
	'HEAD_DELEGATES',
	'SUPERVISORS',
	'SUPERVISORS_REGISTRATION_NOT_COMPLETED',
	'TEAM'
] as const;

export type GlobalListType = (typeof GLOBAL_LIST_TYPES)[number];
export type ConferenceListType = (typeof CONFERENCE_LIST_TYPES)[number];

/**
 * One row per Listmonk list the sync manages, so it knows its lists by id: a list's name holds
 * the conference title and changes with it. Lists of other systems in the same instance have no
 * row and are never touched.
 */
export const mailingList = snakeCase.table(
	'mailing_list',
	{
		...defaultIdAndTimestamps,
		listmonkListId: integer().notNull().unique(),
		/**
		 * Null for a global list. Deliberately no foreign key: the row outlives a deleted conference,
		 * so the next sync still knows the list, deletes it in Listmonk and then the row.
		 */
		conferenceId: text(),
		listType: text().$type<GlobalListType | ConferenceListType>().notNull()
	},
	(table) => [
		unique('mailing_list_conference_id_list_type_key')
			.on(table.conferenceId, table.listType)
			.nullsNotDistinct()
	]
);
