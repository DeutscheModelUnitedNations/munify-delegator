import { z } from 'zod';
import { allColors } from '$lib/components/calendar/calendarColors';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const placeSchema = z.object({
	name: z.string().min(1),
	address: z.string().nullable(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	directions: z.string().nullable(),
	info: z.string().nullable(),
	websiteUrl: z.string().nullable()
});

const entrySchema = z
	.object({
		name: z.string().min(1),
		description: z.string().nullable(),
		startTime: z.string().regex(timeRegex),
		endTime: z.string().regex(timeRegex),
		fontAwesomeIcon: z.string().nullable(),
		color: z.enum(allColors),
		room: z.string().nullable(),
		// Files from before an entry could span tracks name one `trackName`
		trackName: z.string().nullable().optional(),
		/** The tracks the entry runs on; older files leave them out for all of them */
		trackNames: z.array(z.string()).optional(),
		place: placeSchema.nullable()
	})
	.transform(({ trackName, trackNames, ...entry }) => ({
		...entry,
		trackNames: trackNames ?? (trackName ? [trackName] : [])
	}));

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

export type CalendarDayExportData = z.output<typeof calendarDayExportSchema>;
