import type { Insert } from '../rows';
import {
	makeSeedCalendarDay,
	makeSeedCalendarEntry,
	makeSeedCalendarTrack,
	makeSeedPlace
} from '../seed-data/calendarDay';
import type { ConferenceSeed } from './context';

/**
 * A three-day programme from the first conference day: shared ceremonies and breaks plus three
 * parallel committee tracks, which is what the calendar views need to be worth looking at.
 */
export function addCalendar(cs: ConferenceSeed) {
	if (!cs.plan.with.calendar) return;
	const conferenceId = cs.id;
	const firstDay = cs.startConference;
	const dayNames = ['Donnerstag', 'Freitag', 'Samstag'];
	const dayDates = dayNames.map((_name, index) => {
		const date = new Date(firstDay);
		date.setDate(date.getDate() + index);
		return date;
	});

	const days = dayNames.map((name, index) =>
		makeSeedCalendarDay({ conferenceId, name, date: dayDates[index], sortOrder: index })
	);
	cs.batch.calendarDay.push(...days);

	const trackNames = ['GV Presse', 'IMO MRR', 'Sicherheitsrat'];
	const tracksPerDay = days.map((day) =>
		trackNames.map((name, sortOrder) =>
			makeSeedCalendarTrack({ calendarDayId: day.id, name, sortOrder })
		)
	);
	cs.batch.calendarTrack.push(...tracksPerDay.flat());

	const landtag = makeSeedPlace({
		conferenceId,
		name: 'Landtag Niedersachsen',
		address: 'Hannah-Arendt-Platz 1, 30159 Hannover',
		latitude: 52.3613,
		longitude: 9.7414,
		directions: 'Vom Hauptbahnhof mit der U-Bahn Linie 3 oder 7 bis Waterloo, dann 5 Min zu Fuß.',
		info: 'Bitte Personalausweis mitbringen. Keine Getränke im Plenarsaal.'
	});
	const kulturzentrum = makeSeedPlace({
		conferenceId,
		name: 'Kulturzentrum',
		address: 'Beispielstr. 42, 30159 Hannover',
		latitude: 52.374,
		longitude: 9.7385
	});
	cs.batch.place.push(landtag, kulturzentrum);

	function at(date: Date, hours: number, minutes: number) {
		const time = new Date(date);
		time.setHours(hours, minutes, 0, 0);
		return time;
	}

	/** The same session in all three tracks, one room each. */
	function parallelSessions(
		dayIndex: number,
		name: string,
		from: [number, number],
		to: [number, number]
	) {
		return tracksPerDay[dayIndex].map((track, trackIndex) =>
			makeSeedCalendarEntry({
				calendarDayId: days[dayIndex].id,
				calendarTrackId: track.id,
				name,
				startTime: at(dayDates[dayIndex], from[0], from[1]),
				endTime: at(dayDates[dayIndex], to[0], to[1]),
				color: 'SESSION',
				fontAwesomeIcon: 'gavel',
				room: `Raum ${201 + trackIndex}`
			})
		);
	}

	const entries: Insert<'calendarEntry'>[] = [
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Eröffnungsfeier',
			startTime: at(dayDates[0], 10, 0),
			endTime: at(dayDates[0], 11, 30),
			color: 'CEREMONY',
			fontAwesomeIcon: 'flag',
			placeId: landtag.id,
			room: 'Plenarsaal'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Mittagspause',
			startTime: at(dayDates[0], 11, 30),
			endTime: at(dayDates[0], 12, 30),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		...parallelSessions(0, 'Sitzung I', [12, 30], [14, 30]),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Kaffeepause',
			startTime: at(dayDates[0], 14, 30),
			endTime: at(dayDates[0], 15, 0),
			color: 'BREAK',
			fontAwesomeIcon: 'mug-hot'
		}),
		...parallelSessions(0, 'Sitzung II', [15, 0], [17, 0]),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Abendessen',
			startTime: at(dayDates[0], 17, 30),
			endTime: at(dayDates[0], 18, 30),
			color: 'SOCIAL',
			fontAwesomeIcon: 'utensils'
		}),
		...parallelSessions(1, 'Sitzung III', [9, 0], [11, 0]),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id,
			name: 'Mittagspause',
			startTime: at(dayDates[1], 11, 0),
			endTime: at(dayDates[1], 12, 0),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id,
			name: 'Workshop: Diplomatische Verhandlungen',
			startTime: at(dayDates[1], 12, 0),
			endTime: at(dayDates[1], 13, 30),
			color: 'WORKSHOP',
			fontAwesomeIcon: 'chalkboard-user',
			room: 'Saal A'
		}),
		...parallelSessions(1, 'Sitzung IV', [13, 30], [15, 30]),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id,
			name: 'Delegiertenabend',
			startTime: at(dayDates[1], 18, 0),
			endTime: at(dayDates[1], 22, 0),
			color: 'SOCIAL',
			fontAwesomeIcon: 'party-horn',
			placeId: kulturzentrum.id
		}),
		...parallelSessions(2, 'Sitzung V', [9, 0], [11, 0]),
		makeSeedCalendarEntry({
			calendarDayId: days[2].id,
			name: 'Mittagspause',
			startTime: at(dayDates[2], 11, 0),
			endTime: at(dayDates[2], 12, 0),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[2].id,
			name: 'Abschlussfeier',
			startTime: at(dayDates[2], 12, 0),
			endTime: at(dayDates[2], 14, 0),
			color: 'CEREMONY',
			fontAwesomeIcon: 'award',
			placeId: landtag.id,
			room: 'Plenarsaal'
		})
	];
	cs.batch.calendarEntry.push(...entries);
}
