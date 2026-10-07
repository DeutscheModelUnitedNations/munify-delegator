import type { CalendarentrycolorEnum } from '$lib/api/rumbleClient/client';

export interface CalendarPlace {
	id: string;
	name: string;
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	directions?: string | null;
	info?: string | null;
	websiteUrl?: string | null;
	sitePlanUrl?: string | null;
}

export interface CalendarTrack {
	id: string;
	name: string;
	description?: string | null;
	sortOrder: number;
}

export interface CalendarEntry {
	id: string;
	startTime: Date;
	endTime: Date;
	name: string;
	description?: string | null;
	fontAwesomeIcon?: string | null;
	color: CalendarentrycolorEnum;
	place?: CalendarPlace | null;
	room?: string | null;
	calendarTrackId?: string | null;
}

export interface CalendarDay {
	id: string;
	name: string;
	date: Date;
	sortOrder: number;
	tracks: CalendarTrack[];
	entries: CalendarEntry[];
}
