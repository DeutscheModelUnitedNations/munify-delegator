import * as z from 'zod';
import type { ConferenceSeedingSchema } from './seedSchema';

/**
 * Helpers behind the conference request form (`/management/conference-request`).
 * The form never talks to the API: it only produces a JSON document that matches
 * `ConferenceSeedingSchema` so an admin can import it on `/management/seed`.
 */

const SEED_SCHEMA_URL = 'https://delegator.munify.cloud/schemata/seed';

/** Seeded conferences are created with the database default timezone. */
const CONFERENCE_TIMEZONE = 'Europe/Berlin';

export type SeedJson = z.input<typeof ConferenceSeedingSchema>;

export type CommitteeDraft = {
	key: string;
	name: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
	nations: string[];
};

export type NsaDraft = {
	key: string;
	name: string;
	abbreviation: string;
	seatAmount: number;
	description: string;
	fontAwesomeIcon: string;
};

export type RoleDraft = {
	key: string;
	name: string;
	description: string;
	fontAwesomeIcon: string;
};

export type RequestFormState = {
	title: string;
	longTitle: string;
	location: string;
	website: string;
	language: string;
	/** `datetime-local` values (`YYYY-MM-DDTHH:mm`), interpreted in Europe/Berlin */
	startAssignment: string;
	startConference: string;
	endConference: string;
	committees: CommitteeDraft[];
	nsa: NsaDraft[];
	customConferenceRole: RoleDraft[];
};

export const emptyRequestForm = (): RequestFormState => ({
	title: '',
	longTitle: '',
	location: '',
	website: '',
	language: '',
	startAssignment: '',
	startConference: '',
	endConference: '',
	committees: [],
	nsa: [],
	customConferenceRole: []
});

export const newCommittee = (): CommitteeDraft => ({
	key: crypto.randomUUID(),
	name: '',
	abbreviation: '',
	numOfSeatsPerDelegation: 1,
	nations: []
});

export const newNsa = (): NsaDraft => ({
	key: crypto.randomUUID(),
	name: '',
	abbreviation: '',
	seatAmount: 1,
	description: '',
	fontAwesomeIcon: ''
});

export const newRole = (): RoleDraft => ({
	key: crypto.randomUUID(),
	name: '',
	description: '',
	fontAwesomeIcon: ''
});

const zonedParts = (utcMs: number) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: CONFERENCE_TIMEZONE,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).formatToParts(new Date(utcMs));
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? '00';
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute')
	};
};

/** Offset of Europe/Berlin from UTC in minutes at the given instant */
const offsetMinutesAt = (utcMs: number) => {
	const p = zonedParts(utcMs);
	const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
	return Math.round((asUtc - Math.floor(utcMs / 60000) * 60000) / 60000);
};

const formatOffset = (offsetMinutes: number) => {
	const sign = offsetMinutes < 0 ? '-' : '+';
	const abs = Math.abs(offsetMinutes);
	return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

/** `2027-03-10T09:00` (Berlin wall clock) → `2027-03-10T09:00:00+01:00`; empty if incomplete */
export const localToIso = (value: string): string => {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!match) return '';
	const [, year, month, day, hour, minute] = match;
	const wallClockAsUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute);
	let offset = offsetMinutesAt(wallClockAsUtc);
	// re-check once with the corrected instant, so dates right at a DST switch resolve properly
	offset = offsetMinutesAt(wallClockAsUtc - offset * 60000);
	return `${year}-${month}-${day}T${hour}:${minute}:00${formatOffset(offset)}`;
};

/** `2027-03-10T09:00:00+01:00` → `2027-03-10T09:00` (Berlin wall clock); empty if unparsable */
export const isoToLocal = (value: string): string => {
	const ms = Date.parse(value);
	if (Number.isNaN(ms)) return '';
	const p = zonedParts(ms);
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Builds the JSON document an admin imports on `/management/seed` */
export const toSeedJson = (state: RequestFormState): SeedJson => ({
	$schema: SEED_SCHEMA_URL,
	conference: {
		title: state.title.trim(),
		longTitle: state.longTitle.trim(),
		location: state.location.trim(),
		website: state.website.trim(),
		language: state.language.trim(),
		startAssignment: localToIso(state.startAssignment),
		startConference: localToIso(state.startConference),
		endConference: localToIso(state.endConference)
	},
	nsa: state.nsa.map((nsa) => ({
		name: nsa.name.trim(),
		abbreviation: nsa.abbreviation.trim(),
		seatAmount: nsa.seatAmount,
		description: nsa.description.trim(),
		fontAwesomeIcon: nsa.fontAwesomeIcon.trim()
	})),
	committees: state.committees.map((committee) => ({
		name: committee.name.trim(),
		abbreviation: committee.abbreviation.trim(),
		nations: committee.nations,
		numOfSeatsPerDelegation: committee.numOfSeatsPerDelegation
	})),
	customConferenceRole: state.customConferenceRole.map((role) => ({
		name: role.name.trim(),
		description: role.description.trim(),
		fontAwesomeIcon: role.fontAwesomeIcon.trim()
	}))
});

// Lenient on purpose: an import (or a stored draft) may be incomplete or even invalid,
// the form then simply shows what is wrong. Only the structure has to be recognisable.
const text = z.string().catch('');
const count = z.number().catch(1);

const importSchema = z.object({
	conference: z
		.object({
			title: text,
			longTitle: text,
			location: text,
			website: text,
			language: text,
			startAssignment: text,
			startConference: text,
			endConference: text
		})
		.partial()
		.catch({}),
	nsa: z
		.array(
			z.object({
				name: text,
				abbreviation: text,
				seatAmount: count,
				description: text,
				fontAwesomeIcon: text
			})
		)
		.catch([]),
	committees: z
		.array(
			z.object({
				name: text,
				abbreviation: text,
				numOfSeatsPerDelegation: count,
				nations: z.array(z.string()).catch([])
			})
		)
		.catch([]),
	customConferenceRole: z
		.array(z.object({ name: text, description: text, fontAwesomeIcon: text }))
		.catch([])
});

/** Parses JSON text (import or stored draft) into form state; `null` if it is not a seed document */
export const fromSeedJsonText = (raw: string): RequestFormState | null => {
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch {
		return null;
	}
	const parsed = importSchema.safeParse(json);
	if (!parsed.success) return null;

	const { conference, nsa, committees, customConferenceRole } = parsed.data;
	return {
		title: conference.title ?? '',
		longTitle: conference.longTitle ?? '',
		location: conference.location ?? '',
		website: conference.website ?? '',
		language: conference.language ?? '',
		startAssignment: isoToLocal(conference.startAssignment ?? ''),
		startConference: isoToLocal(conference.startConference ?? ''),
		endConference: isoToLocal(conference.endConference ?? ''),
		nsa: nsa.map((item) => ({ ...item, key: crypto.randomUUID() })),
		committees: committees.map((item) => ({ ...item, key: crypto.randomUUID() })),
		customConferenceRole: customConferenceRole.map((item) => ({
			...item,
			key: crypto.randomUUID()
		}))
	};
};
