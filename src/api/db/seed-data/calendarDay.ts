import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

export function makeSeedCalendarDay(
	options: Pick<
		typeof schema.calendarDay.$inferInsert,
		'conferenceId' | 'date' | 'name' | 'sortOrder'
	>
): typeof schema.calendarDay.$inferInsert & { id: string } {
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
	options: Pick<typeof schema.calendarTrack.$inferInsert, 'calendarDayId' | 'name' | 'sortOrder'> &
		Partial<Pick<typeof schema.calendarTrack.$inferInsert, 'description'>>
): typeof schema.calendarTrack.$inferInsert & { id: string } {
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
	options: Pick<typeof schema.place.$inferInsert, 'conferenceId' | 'name'> &
		Partial<
			Pick<
				typeof schema.place.$inferInsert,
				| 'address'
				| 'latitude'
				| 'longitude'
				| 'directions'
				| 'info'
				| 'websiteUrl'
				| 'sitePlanDataURL'
			>
		>
): typeof schema.place.$inferInsert & { id: string } {
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
		typeof schema.calendarEntry.$inferInsert,
		'calendarDayId' | 'name' | 'startTime' | 'endTime' | 'color'
	> &
		Partial<
			Pick<
				typeof schema.calendarEntry.$inferInsert,
				'description' | 'fontAwesomeIcon' | 'placeId' | 'room'
			>
		>
): typeof schema.calendarEntry.$inferInsert & { id: string } {
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
