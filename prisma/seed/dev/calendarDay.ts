import type { CalendarDay, CalendarTrack, CalendarEntry, CalendarEntryColor } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedCalendarDay(
	options: Pick<CalendarDay, 'conferenceId' | 'date' | 'name' | 'sortOrder'>
): CalendarDay {
	return {
		id: faker.database.mongodbObjectId(),
		date: options.date,
		name: options.name,
		sortOrder: options.sortOrder,
		conferenceId: options.conferenceId,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}

export function makeSeedCalendarTrack(
	options: Pick<CalendarTrack, 'calendarDayId' | 'name' | 'sortOrder'> &
		Partial<Pick<CalendarTrack, 'description'>>
): CalendarTrack {
	return {
		id: faker.database.mongodbObjectId(),
		name: options.name,
		description: options.description ?? null,
		sortOrder: options.sortOrder,
		calendarDayId: options.calendarDayId,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}

export function makeSeedCalendarEntry(
	options: Pick<CalendarEntry, 'calendarDayId' | 'name' | 'startTime' | 'endTime' | 'color'> &
		Partial<
			Pick<CalendarEntry, 'calendarTrackId' | 'description' | 'fontAwesomeIcon' | 'place' | 'room'>
		>
): CalendarEntry {
	return {
		id: faker.database.mongodbObjectId(),
		name: options.name,
		description: options.description ?? null,
		startTime: options.startTime,
		endTime: options.endTime,
		fontAwesomeIcon: options.fontAwesomeIcon ?? null,
		color: options.color,
		place: options.place ?? null,
		room: options.room ?? null,
		calendarDayId: options.calendarDayId,
		calendarTrackId: options.calendarTrackId ?? null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
