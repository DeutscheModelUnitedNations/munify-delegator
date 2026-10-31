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
import { committee } from './committees';
import { conferenceRole } from './roles';

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

/**
 * A parallel strand of the conference's programme (a committee's sessions, a workshop line). It is
 * the conference's, not a day's: the days it runs on are `calendarDayToCalendarTrack`, and the
 * seats it is for its committees and roles.
 */
export const calendarTrack = snakeCase.table(
	'calendar_track',
	{
		...defaultIdAndTimestamps,
		name: text().notNull(),
		description: text(),
		sortOrder: integer().notNull(),
		conferenceId: conferenceRef('cascade')
	},
	(table) => [
		uniqueIndex('calendar_track_conference_id_name_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.name.asc().nullsLast()
		)
	]
);

/** The days a track runs on (`a` the day, `b` the track); an entry runs only on its day's tracks. */
export const calendarDayToCalendarTrack = implicitManyToMany({
	name: 'calendar_day_to_calendar_track',
	a: () => calendarDay.id,
	b: () => calendarTrack.id
});

/**
 * The committees whose members a track is for (`a` the track, `b` the committee): their dashboard
 * shows what is next on it.
 */
export const calendarTrackToCommittee = implicitManyToMany({
	name: 'calendar_track_to_committee',
	a: () => calendarTrack.id,
	b: () => committee.id
});

/**
 * The roles whose holders a track is for (`a` the track, `b` the role): a non-state actor's
 * delegation, a custom role's single participant.
 */
export const calendarTrackToConferenceRole = implicitManyToMany({
	name: 'calendar_track_to_conference_role',
	a: () => calendarTrack.id,
	b: () => conferenceRole.id
});

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
export const calendarEntryToCalendarTrack = implicitManyToMany({
	name: 'calendar_entry_to_calendar_track',
	a: () => calendarEntry.id,
	b: () => calendarTrack.id
});

/**
 * The survey options an entry is limited to (`a` the entry, `b` the option): only those who picked
 * one of them, and the conference's team, see it; an entry without any is for everybody. An option
 * an entry names cannot be deleted, which would silently widen the entry's audience.
 */
export const calendarEntryToSurveyOption = implicitManyToMany({
	name: 'calendar_entry_to_survey_option',
	a: () => calendarEntry.id,
	b: () => surveyOption.id,
	bOnDelete: 'restrict'
});
