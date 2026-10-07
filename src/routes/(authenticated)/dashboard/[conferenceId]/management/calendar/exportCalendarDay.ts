import { client } from '$lib/api/rumbleClient/client';
import { downloadJSON } from '$lib/utils/downloadHelpers';
import { toCalendarDayExport } from './calendarDayExportData';

/** Fetches one day's tracks and entries on demand and downloads them as an import file. */
export async function exportCalendarDay(dayId: string) {
	const day = await client.query.calendarDay({
		__args: { id: dayId },
		id: true,
		name: true,
		tracks: { id: true, name: true, description: true, sortOrder: true },
		entries: {
			id: true,
			name: true,
			description: true,
			startTime: true,
			endTime: true,
			fontAwesomeIcon: true,
			color: true,
			room: true,
			calendarTrackId: true,
			place: {
				id: true,
				name: true,
				address: true,
				latitude: true,
				longitude: true,
				directions: true,
				info: true,
				websiteUrl: true
			}
		}
	});

	downloadJSON(toCalendarDayExport(day), `calendar-day-${day.name}.json`);
}
