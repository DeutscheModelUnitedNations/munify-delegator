import {
	snakeCase,
	pgEnum,
	text,
	timestamp,
	integer,
	date,
	doublePrecision,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, implicitManyToMany } from './helpers';
import { conferenceRef } from './conference';
import { fileRef } from './storedFile';
import { surveyOption } from './surveys';

/** A conference's calendar: days, tracks, entries and the places they happen at. */

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

/** A venue of the conference that calendar entries can name, with directions and a site plan. */
export const place = snakeCase.table(
	'place',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		address: text(),
		latitude: doublePrecision(),
		longitude: doublePrecision(),
		directions: text(),
		info: text(),
		websiteUrl: text(),
		sitePlanFileId: fileRef(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('place_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

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

/**
 * The survey options an entry is limited to (`a` the entry, `b` the option): only those who picked
 * one of them, and the conference's team, see it; an entry without any is for everybody. An option
 * an entry names cannot be deleted, which would silently widen the entry's audience.
 */
export const calendarEntryToSurveyOption = implicitManyToMany(
	'calendar_entry_to_survey_option',
	() => calendarEntry.id,
	() => surveyOption.id,
	{ bOnDelete: 'restrict' }
);
