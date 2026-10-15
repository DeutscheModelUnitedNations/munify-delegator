import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	integer,
	date,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, implicitManyToMany } from './helpers';
import { conferenceRef, place } from './conference';

/** A conference's calendar: days, tracks and entries. */

export const calendarEntryColor = pgEnum('calendar_entry_color', [
	'SESSION',
	'WORKSHOP',
	'LOGISTICS',
	'SOCIAL',
	'CEREMONY',
	'BREAK',
	'HIGHLIGHT',
	'INFO'
]);

export const calendarDay = snakeCase.table(
	'calendar_day',
	{
		...defaultIdAndTimestamps,
		date: timestamp({ precision: 3 }).notNull(),
		name: text().notNull(),
		sortOrder: integer().notNull(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('calendar_day_conference_id_sort_order_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.sortOrder.asc().nullsLast()
		)
	]
);

export const calendarTrack = snakeCase.table(
	'calendar_track',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		description: text(),
		sortOrder: integer().notNull(),
		calendarDayId: text()
			.notNull()
			.references(() => calendarDay.id, { onDelete: 'cascade', onUpdate: 'cascade' })
	},
	(table) => [
		uniqueIndex('calendar_track_calendar_day_id_sort_order_key').using(
			'btree',
			table.calendarDayId.asc().nullsLast(),
			table.sortOrder.asc().nullsLast()
		)
	]
);

export const calendarEntry = snakeCase.table('calendar_entry', {
	...defaultIdAndTimestamps,
	startTime: timestamp({ precision: 3 }).notNull(),
	endTime: timestamp({ precision: 3 }).notNull(),
	name: text().notNull(),
	description: text(),
	fontAwesomeIcon: text(),
	color: calendarEntryColor().default('SESSION').notNull(),
	room: text(),
	calendarDayId: text()
		.notNull()
		.references(() => calendarDay.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	placeId: text().references(() => place.id, { onDelete: 'set null', onUpdate: 'cascade' })
});

/** The tracks an entry runs on. Every entry runs on at least one track. */
export const calendarEntryToCalendarTrack = implicitManyToMany(
	'calendar_entry_to_calendar_track',
	() => calendarEntry.id,
	() => calendarTrack.id
);
