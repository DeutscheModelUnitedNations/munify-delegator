import { snakeCase, text, boolean, jsonb, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps } from './helpers';
import { user, userRef } from './users';
import { conference, conferenceRef } from './conference';

/**
 * Saved views of the team's data tables (`#lib/dataGrid`): a name and a whole grid state - filter,
 * sorting, grouping, columns, page size - for one table (`tableKey`, `DATA_TABLE_KEYS`).
 *
 * A view is personal (`ownerUserId`, only its owner sees it) or shared (everyone who opens the
 * table), and belongs to one conference or, without `conferenceId`, to all of them. A shared view
 * can be its conference's default (`isDefault`, one per table and conference, and one global one
 * per table). `state` is checked against `tableStateSchema` when it is written; reading it again
 * a view whose state no longer fits opens as the table's base view.
 */
export const tableView = snakeCase.table(
	'table_view',
	{
		...defaultIdAndTimestamps,
		tableKey: text().notNull(),
		name: text().notNull(),
		state: jsonb().notNull(),
		shared: boolean().default(false).notNull(),
		conferenceId: text().references(() => conference.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade'
		}),
		ownerUserId: text().references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		isDefault: boolean().default(false).notNull(),
		createdById: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' })
	},
	(table) => [
		index('table_view_table_key_conference_id_idx').on(table.tableKey, table.conferenceId),
		index('table_view_owner_user_id_idx').on(table.ownerUserId),
		uniqueIndex('table_view_conference_default_key')
			.on(table.tableKey, table.conferenceId)
			.where(sql`${table.isDefault} and ${table.conferenceId} is not null`),
		uniqueIndex('table_view_global_default_key')
			.on(table.tableKey)
			.where(sql`${table.isDefault} and ${table.conferenceId} is null`),
		check(
			'table_view_owned_unless_shared',
			sql`(${table.shared} and ${table.ownerUserId} is null) or (not ${table.shared} and ${table.ownerUserId} is not null)`
		),
		check('table_view_default_is_shared', sql`not ${table.isDefault} or ${table.shared}`)
	]
);

/**
 * The view a person opens a table with in one conference, picked by them: one of their own or a
 * shared one. Without it the conference's shared default applies.
 */
export const tableViewDefault = snakeCase.table(
	'table_view_default',
	{
		...defaultIdAndTimestamps,
		userId: userRef('cascade'),
		tableKey: text().notNull(),
		conferenceId: conferenceRef('cascade'),
		viewId: text()
			.notNull()
			.references(() => tableView.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('table_view_default_user_table_conference_key').on(
			table.userId,
			table.tableKey,
			table.conferenceId
		),
		index('table_view_default_view_id_idx').on(table.viewId)
	]
);
