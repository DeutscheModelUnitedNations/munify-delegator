import type * as schema from '../schema';
import {
	makeSeedCalendarDay,
	makeSeedCalendarEntry,
	makeSeedCalendarTrack,
	makeSeedPlace
} from '../seed-data/calendarDay';
import { wallClockNow } from '../../../lib/components/calendar/calendarNow';
import type { ConferenceSeed } from './context';
import { sitePlanPdf } from '../seed-data/pdfDocuments';
import { addSeedFile } from './files';

const MINUTE_MS = 60 * 1000;

/**
 * A three-day programme from the first conference day: shared ceremonies and breaks plus three
 * parallel committee tracks, which is what the calendar views need to be worth looking at.
 *
 * Calendar times are wall-clock times in the conference's timezone, stored as if they were UTC (the
 * views read them back in UTC), so they are built with `Date.UTC` and never with the seeding
 * machine's own timezone. The running conference's programme is moved so that the moment of seeding
 * falls inside its second day, which is "today": there is always something on now and something
 * coming up.
 */
export async function addCalendar(cs: ConferenceSeed) {
	if (!cs.plan.with.calendar) return;
	const conferenceId = cs.id;
	const timezone = cs.conference.timezone ?? 'Europe/Berlin';

	// The first day as a calendar date in the conference's timezone: the wall clock of that moment
	// read as UTC gives it directly.
	const firstDay = new Date(wallClockNow({ timezone, now: cs.startConference }));
	const dayDates = [0, 1, 2].map(
		(index) =>
			new Date(
				Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), firstDay.getUTCDate() + index)
			)
	);
	const dayNames = dayDates.map((date) =>
		new Intl.DateTimeFormat('de', { weekday: 'long', timeZone: 'UTC' }).format(date)
	);

	// The programme runs from 09:00 to 22:00. For the running conference it slides, by quarter hours
	// and never past midnight, until the present sits at 10:00 of today's programme.
	const PROGRAMME_START = 9 * 60;
	const PROGRAMME_END = 22 * 60;
	const anchoredToNow = cs.plan.conference.state === 'ACTIVE';
	const nowMinutes = (wallClockNow({ timezone }) % (24 * 60 * MINUTE_MS)) / MINUTE_MS;
	const shift = anchoredToNow
		? Math.min(
				Math.max(Math.round((nowMinutes - 10 * 60) / 15) * 15, -PROGRAMME_START),
				24 * 60 - PROGRAMME_END
			)
		: 0;

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

	/** A venue's floor plan, uploaded the way participant care would. */
	const sitePlan = async ({ venue, rooms }: { venue: string; rooms: string[] }) =>
		addSeedFile({
			batch: cs.batch,
			file: {
				conferenceId,
				kind: 'place',
				field: 'sitePlan',
				bytes: await sitePlanPdf({ venue, rooms }),
				mimeType: 'application/pdf',
				fileName: `Lageplan ${venue}.pdf`
			}
		});

	const landtag = makeSeedPlace({
		conferenceId,
		name: 'Landtag Niedersachsen',
		address: 'Hannah-Arendt-Platz 1, 30159 Hannover',
		latitude: 52.3613,
		longitude: 9.7414,
		directions: 'Vom Hauptbahnhof mit der U-Bahn Linie 3 oder 7 bis Waterloo, dann 5 Min zu Fuß.',
		info: 'Bitte Personalausweis mitbringen. Keine Getränke im Plenarsaal.',
		sitePlanFileId: await sitePlan({
			venue: 'Landtag Niedersachsen',
			rooms: ['Plenarsaal', 'Raum 201', 'Raum 202', 'Raum 203']
		})
	});
	const kulturzentrum = makeSeedPlace({
		conferenceId,
		name: 'Kulturzentrum',
		address: 'Beispielstr. 42, 30159 Hannover',
		latitude: 52.374,
		longitude: 9.7385,
		sitePlanFileId: await sitePlan({
			venue: 'Kulturzentrum',
			rooms: ['Großer Saal', 'Workshop 1', 'Workshop 2']
		})
	});
	cs.batch.place.push(landtag, kulturzentrum);

	/** A wall-clock time of a programme day, shifted along with the programme */
	function at({ date, hours, minutes }: { date: Date; hours: number; minutes: number }) {
		return new Date(date.getTime() + (hours * 60 + minutes + shift) * MINUTE_MS);
	}

	const trackLinks: (typeof schema.calendarEntryToCalendarTrack.$inferInsert)[] = [];

	/** The same session in all three tracks, one room each. */
	function parallelSessions({
		dayIndex,
		name,
		from,
		to
	}: {
		dayIndex: number;
		name: string;
		from: [number, number];
		to: [number, number];
	}) {
		return tracksPerDay[dayIndex].map((track, trackIndex) => {
			const entry = makeSeedCalendarEntry({
				calendarDayId: days[dayIndex].id,
				name,
				startTime: at({ date: dayDates[dayIndex], hours: from[0], minutes: from[1] }),
				endTime: at({ date: dayDates[dayIndex], hours: to[0], minutes: to[1] }),
				color: 'SESSION',
				fontAwesomeIcon: 'gavel',
				room: `Raum ${201 + trackIndex}`
			});
			trackLinks.push({ a: entry.id, b: track.id });
			return entry;
		});
	}

	// Runs on the first two of the day's three tracks
	const workshop = makeSeedCalendarEntry({
		calendarDayId: days[1].id,
		name: 'Workshop: Diplomatische Verhandlungen',
		startTime: at({ date: dayDates[1], hours: 12, minutes: 0 }),
		endTime: at({ date: dayDates[1], hours: 13, minutes: 30 }),
		color: 'WORKSHOP',
		fontAwesomeIcon: 'chalkboard-user',
		room: 'Saal A'
	});
	trackLinks.push(
		{ a: workshop.id, b: tracksPerDay[1][0].id },
		{ a: workshop.id, b: tracksPerDay[1][1].id }
	);

	const entries: (typeof schema.calendarEntry.$inferInsert & { id: string })[] = [
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Eröffnungsfeier',
			startTime: at({ date: dayDates[0], hours: 10, minutes: 0 }),
			endTime: at({ date: dayDates[0], hours: 11, minutes: 30 }),
			color: 'CEREMONY',
			fontAwesomeIcon: 'flag',
			placeId: landtag.id,
			room: 'Plenarsaal'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Mittagspause',
			startTime: at({ date: dayDates[0], hours: 11, minutes: 30 }),
			endTime: at({ date: dayDates[0], hours: 12, minutes: 30 }),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		...parallelSessions({ dayIndex: 0, name: 'Sitzung I', from: [12, 30], to: [14, 30] }),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Kaffeepause',
			startTime: at({ date: dayDates[0], hours: 14, minutes: 30 }),
			endTime: at({ date: dayDates[0], hours: 15, minutes: 0 }),
			color: 'BREAK',
			fontAwesomeIcon: 'mug-hot'
		}),
		...parallelSessions({ dayIndex: 0, name: 'Sitzung II', from: [15, 0], to: [17, 0] }),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id,
			name: 'Abendessen',
			startTime: at({ date: dayDates[0], hours: 17, minutes: 30 }),
			endTime: at({ date: dayDates[0], hours: 18, minutes: 30 }),
			color: 'SOCIAL',
			fontAwesomeIcon: 'utensils'
		}),
		...parallelSessions({ dayIndex: 1, name: 'Sitzung III', from: [9, 0], to: [11, 0] }),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id,
			name: 'Mittagspause',
			startTime: at({ date: dayDates[1], hours: 11, minutes: 0 }),
			endTime: at({ date: dayDates[1], hours: 12, minutes: 0 }),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		workshop,
		...parallelSessions({ dayIndex: 1, name: 'Sitzung IV', from: [13, 30], to: [15, 30] }),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id,
			name: 'Delegiertenabend',
			startTime: at({ date: dayDates[1], hours: 18, minutes: 0 }),
			endTime: at({ date: dayDates[1], hours: 22, minutes: 0 }),
			color: 'SOCIAL',
			fontAwesomeIcon: 'party-horn',
			placeId: kulturzentrum.id
		}),
		...parallelSessions({ dayIndex: 2, name: 'Sitzung V', from: [9, 0], to: [11, 0] }),
		makeSeedCalendarEntry({
			calendarDayId: days[2].id,
			name: 'Mittagspause',
			startTime: at({ date: dayDates[2], hours: 11, minutes: 0 }),
			endTime: at({ date: dayDates[2], hours: 12, minutes: 0 }),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[2].id,
			name: 'Abschlussfeier',
			startTime: at({ date: dayDates[2], hours: 12, minutes: 0 }),
			endTime: at({ date: dayDates[2], hours: 14, minutes: 0 }),
			color: 'CEREMONY',
			fontAwesomeIcon: 'award',
			placeId: landtag.id,
			room: 'Plenarsaal'
		})
	];
	// Entries without a track of their own run on every track of their day
	const linked = new Set(trackLinks.map((link) => link.a));
	for (const entry of [...entries].filter((e) => !linked.has(e.id))) {
		const day = days.findIndex((d) => d.id === entry.calendarDayId);
		trackLinks.push(...tracksPerDay[day].map((track) => ({ a: entry.id, b: track.id })));
	}
	cs.batch.calendarEntry.push(...entries);
	cs.batch.calendarEntryToCalendarTrack.push(...trackLinks);
}
