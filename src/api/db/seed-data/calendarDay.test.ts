import { describe, expect, test } from 'vitest';
import { makeSeedCalendarEntry, makeSeedPlace } from './calendarDay';

describe('makeSeedPlace', () => {
	test('stores the details it is given', () => {
		const place = makeSeedPlace({
			conferenceId: 'c1',
			name: 'Landtag',
			address: 'Düsternbrooker Weg 70',
			latitude: 54.33,
			longitude: 10.15,
			directions: 'Haupteingang',
			info: 'Ausweis mitbringen',
			websiteUrl: 'https://landtag.example',
			sitePlanDataURL: 'data:image/png;base64,'
		});
		expect(place).toMatchObject({
			conferenceId: 'c1',
			name: 'Landtag',
			address: 'Düsternbrooker Weg 70',
			latitude: 54.33,
			longitude: 10.15,
			directions: 'Haupteingang',
			info: 'Ausweis mitbringen',
			websiteUrl: 'https://landtag.example',
			sitePlanDataURL: 'data:image/png;base64,'
		});
		expect(place.id).toEqual(expect.any(String));
	});

	test('leaves the details it is not given empty', () => {
		expect(makeSeedPlace({ conferenceId: 'c1', name: 'Mensa' })).toMatchObject({
			address: null,
			latitude: null,
			longitude: null,
			directions: null,
			info: null,
			websiteUrl: null,
			sitePlanDataURL: null
		});
	});
});

describe('makeSeedCalendarEntry', () => {
	const required: Parameters<typeof makeSeedCalendarEntry>[0] = {
		calendarDayId: 'day',
		name: 'Eröffnung',
		startTime: new Date('2026-03-05T09:00:00Z'),
		endTime: new Date('2026-03-05T10:00:00Z'),
		color: 'SESSION'
	};

	test('stores the details it is given', () => {
		expect(
			makeSeedCalendarEntry({
				...required,
				description: 'Feierlich',
				fontAwesomeIcon: 'flag',
				placeId: 'place',
				room: 'Plenarsaal'
			})
		).toMatchObject({
			...required,
			description: 'Feierlich',
			fontAwesomeIcon: 'flag',
			placeId: 'place',
			room: 'Plenarsaal'
		});
	});

	test('leaves the details it is not given empty', () => {
		expect(makeSeedCalendarEntry(required)).toMatchObject({
			description: null,
			fontAwesomeIcon: null,
			placeId: null,
			room: null
		});
	});
});
