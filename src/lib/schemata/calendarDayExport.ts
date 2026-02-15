import { z } from 'zod';

const timeRegex = /^\d{2}:\d{2}$/;

const placeSchema = z.object({
	name: z.string().min(1),
	address: z.string().nullable(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	directions: z.string().nullable(),
	info: z.string().nullable(),
	websiteUrl: z.string().nullable()
});

const entrySchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable(),
	startTime: z.string().regex(timeRegex),
	endTime: z.string().regex(timeRegex),
	fontAwesomeIcon: z.string().nullable(),
	color: z.enum([
		'SESSION',
		'WORKSHOP',
		'LOGISTICS',
		'SOCIAL',
		'CEREMONY',
		'BREAK',
		'HIGHLIGHT',
		'INFO'
	]),
	room: z.string().nullable(),
	trackName: z.string().nullable(),
	place: placeSchema.nullable()
});

const trackSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable(),
	sortOrder: z.number().int()
});

export const calendarDayExportSchema = z.object({
	version: z.literal(1),
	tracks: z.array(trackSchema),
	entries: z.array(entrySchema)
});

export type CalendarDayExportData = z.infer<typeof calendarDayExportSchema>;
