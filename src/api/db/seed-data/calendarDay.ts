import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

export function makeSeedCalendarDay(
	options: Pick<Insert<'calendarDay'>, 'conferenceId' | 'date' | 'name' | 'sortOrder'>
): Insert<'calendarDay'> & { id: string } {
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
	options: Pick<Insert<'calendarTrack'>, 'calendarDayId' | 'name' | 'sortOrder'> &
		Partial<Pick<Insert<'calendarTrack'>, 'description'>>
): Insert<'calendarTrack'> & { id: string } {
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

export function makeSeedPlace(
	options: Pick<Insert<'place'>, 'conferenceId' | 'name'> &
		Partial<
			Pick<
				Insert<'place'>,
				| 'address'
				| 'latitude'
				| 'longitude'
				| 'directions'
				| 'info'
				| 'websiteUrl'
				| 'sitePlanDataURL'
			>
		>
): Insert<'place'> & { id: string } {
	return {
		id: faker.database.mongodbObjectId(),
		name: options.name,
		address: options.address ?? null,
		latitude: options.latitude ?? null,
		longitude: options.longitude ?? null,
		directions: options.directions ?? null,
		info: options.info ?? null,
		websiteUrl: options.websiteUrl ?? null,
		sitePlanDataURL: options.sitePlanDataURL ?? null,
		conferenceId: options.conferenceId,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}

export function makeSeedCalendarEntry(
	options: Pick<
		Insert<'calendarEntry'>,
		'calendarDayId' | 'name' | 'startTime' | 'endTime' | 'color'
	> &
		Partial<Pick<Insert<'calendarEntry'>, 'description' | 'fontAwesomeIcon' | 'placeId' | 'room'>>
): Insert<'calendarEntry'> & { id: string } {
	return {
		id: faker.database.mongodbObjectId(),
		name: options.name,
		description: options.description ?? null,
		startTime: options.startTime,
		endTime: options.endTime,
		fontAwesomeIcon: options.fontAwesomeIcon ?? null,
		color: options.color,
		room: options.room ?? null,
		placeId: options.placeId ?? null,
		calendarDayId: options.calendarDayId,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
