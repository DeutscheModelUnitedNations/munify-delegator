import { describe, expect, test } from 'vitest';
import {
	escapeText,
	foldLine,
	icsCalendar,
	instantOfWallClock,
	utcDateTime,
	type IcsEvent
} from './icsCalendar';

const encoder = new TextEncoder();

describe('escapeText', () => {
	test('escapes what separates values, and line breaks', () => {
		expect(escapeText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
	});
});

describe('foldLine', () => {
	test('leaves a short line alone', () => {
		expect(foldLine('SUMMARY:Opening')).toBe('SUMMARY:Opening');
	});

	test('folds into lines of at most 75 octets without splitting a character', () => {
		const line = `DESCRIPTION:${'ä'.repeat(100)}`;
		const folded = foldLine(line);
		const parts = folded.split('\r\n');
		expect(parts.length).toBeGreaterThan(1);
		for (const part of parts) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
		expect(parts.slice(1).every((part) => part.startsWith(' '))).toBe(true);
		expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join('')).toBe(line);
	});
});

describe('instantOfWallClock', () => {
	test('reads the stored time as the wall clock of the timezone, in summer and winter', () => {
		expect(
			instantOfWallClock({
				wallClock: new Date('2026-07-10T09:00:00Z'),
				timezone: 'Europe/Berlin'
			}).toISOString()
		).toBe('2026-07-10T07:00:00.000Z');
		expect(
			instantOfWallClock({
				wallClock: new Date('2026-02-20T18:30:00Z'),
				timezone: 'Europe/Berlin'
			}).toISOString()
		).toBe('2026-02-20T17:30:00.000Z');
	});
});

describe('utcDateTime', () => {
	test('is the basic UTC format', () => {
		expect(utcDateTime(new Date('2026-02-20T17:30:05.123Z'))).toBe('20260220T173005Z');
	});
});

describe('icsCalendar', () => {
	const event: IcsEvent = {
		id: 'entry1',
		name: 'Opening, plenary',
		description: 'Bring your\nplacard',
		startTime: new Date('2026-02-20T09:00:00Z'),
		endTime: new Date('2026-02-20T10:30:00Z'),
		room: 'Hall A',
		place: { name: 'Town hall', address: 'Main St 1', latitude: 54.32, longitude: 10.13 },
		updatedAt: new Date('2026-01-05T12:00:00Z')
	};
	const ics = icsCalendar({
		name: 'MUN 2026',
		timezone: 'Europe/Berlin',
		events: [event, { ...event, id: 'entry2', description: null, room: null, place: null }],
		host: 'delegator.example',
		now: new Date('2026-01-10T08:00:00Z')
	});
	const lines = ics.split('\r\n');

	test('is a calendar of CRLF lines', () => {
		expect(lines[0]).toBe('BEGIN:VCALENDAR');
		expect(lines).toContain('VERSION:2.0');
		expect(lines.at(-2)).toBe('END:VCALENDAR');
		expect(ics.endsWith('\r\n')).toBe(true);
		expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
	});

	test('names the calendar', () => {
		expect(lines).toContain('X-WR-CALNAME:MUN 2026');
	});

	test('holds one event per entry, with stable UIDs and times in UTC', () => {
		expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(2);
		expect(lines).toContain('UID:entry1@delegator.example');
		expect(lines).toContain('UID:entry2@delegator.example');
		expect(lines).toContain('DTSTART:20260220T080000Z');
		expect(lines).toContain('DTEND:20260220T093000Z');
		expect(lines).toContain('LAST-MODIFIED:20260105T120000Z');
		expect(lines).toContain('DTSTAMP:20260110T080000Z');
	});

	test('escapes text and says where it is', () => {
		expect(lines).toContain('SUMMARY:Opening\\, plenary');
		expect(lines).toContain('DESCRIPTION:Bring your\\nplacard');
		expect(lines).toContain('LOCATION:Town hall\\, Hall A\\, Main St 1');
		expect(lines).toContain('GEO:54.32;10.13');
	});

	test('leaves out what an entry does not have', () => {
		const second = lines.slice(lines.indexOf('UID:entry2@delegator.example'));
		const end = second.indexOf('END:VEVENT');
		const fields = second.slice(0, end).map((line) => line.split(':')[0]);
		expect(fields).not.toContain('DESCRIPTION');
		expect(fields).not.toContain('LOCATION');
		expect(fields).not.toContain('GEO');
	});
});
