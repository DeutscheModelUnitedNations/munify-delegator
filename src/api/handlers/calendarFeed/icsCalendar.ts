import { datetimeLocalToDate } from '#lib/helpers/conferenceTimezoneDate';

/** A schedule as an iCalendar file (RFC 5545), for calendar apps to import or subscribe to. */

export interface IcsEvent {
	id: string;
	name: string;
	description?: string | null;
	/** Wall-clock times in the conference's timezone, stored as if they were UTC (like the schedule). */
	startTime: Date;
	endTime: Date;
	room?: string | null;
	place?: {
		name: string;
		address?: string | null;
		latitude?: number | null;
		longitude?: number | null;
	} | null;
	/** A real instant. */
	updatedAt: Date;
}

/** Text escaped for a property value: backslash, semicolon, comma and line breaks. */
export function escapeText(text: string) {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

const MAX_OCTETS = 75;
const encoder = new TextEncoder();

/**
 * A content line folded into lines of at most 75 octets, continuations starting with a space;
 * never splits a character.
 */
export function foldLine(line: string) {
	const lines: string[] = [];
	let current = '';
	let octets = 0;
	for (const char of line) {
		const size = encoder.encode(char).length;
		// continuation lines lose one octet to the leading space
		const limit = lines.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
		if (octets + size > limit) {
			lines.push(current);
			current = '';
			octets = 0;
		}
		current += char;
		octets += size;
	}
	lines.push(current);
	return lines.join('\r\n ');
}

/** An instant as an iCalendar UTC date-time (`20260220T170000Z`). */
export function utcDateTime(instant: Date) {
	return instant
		.toISOString()
		.replace(/\.\d{3}/, '')
		.replace(/[-:]/g, '');
}

/** A schedule time (wall clock stored as UTC) as the instant it is in `timezone`. */
export function instantOfWallClock({ wallClock, timezone }: { wallClock: Date; timezone: string }) {
	return datetimeLocalToDate({ datetimeLocal: wallClock.toISOString().slice(0, 16), timezone });
}

/** Where an event is, in one line: place, room and the place's address. */
function locationOf(event: IcsEvent) {
	return [event.place?.name, event.room, event.place?.address]
		.filter((part): part is string => !!part)
		.join(', ');
}

function eventLines({
	event,
	timezone,
	host,
	now
}: {
	event: IcsEvent;
	timezone: string;
	host: string;
	now: Date;
}) {
	const location = locationOf(event);
	const latitude = event.place?.latitude;
	const longitude = event.place?.longitude;
	return [
		'BEGIN:VEVENT',
		`UID:${event.id}@${host}`,
		`DTSTAMP:${utcDateTime(now)}`,
		`LAST-MODIFIED:${utcDateTime(event.updatedAt)}`,
		`DTSTART:${utcDateTime(instantOfWallClock({ wallClock: event.startTime, timezone }))}`,
		`DTEND:${utcDateTime(instantOfWallClock({ wallClock: event.endTime, timezone }))}`,
		`SUMMARY:${escapeText(event.name)}`,
		...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
		...(location ? [`LOCATION:${escapeText(location)}`] : []),
		...(latitude != null && longitude != null ? [`GEO:${latitude};${longitude}`] : []),
		'END:VEVENT'
	];
}

/**
 * The calendar file: one event per entry, in UTC so every app shows them in its own timezone.
 * `host` makes the event UIDs globally unique; they stay the same across downloads, so a
 * subscribed calendar updates its events in place.
 */
export function icsCalendar({
	name,
	timezone,
	events,
	host,
	now = new Date()
}: {
	name: string;
	timezone: string;
	events: readonly IcsEvent[];
	host: string;
	now?: Date;
}) {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//MUNify//DELEGATOR//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeText(name)}`,
		`X-WR-TIMEZONE:${timezone}`,
		// a hint only: Google Calendar refreshes on its own schedule (hours)
		'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
		'X-PUBLISHED-TTL:PT1H',
		...events.flatMap((event) => eventLines({ event, timezone, host, now })),
		'END:VCALENDAR'
	];
	return lines.map(foldLine).join('\r\n') + '\r\n';
}
