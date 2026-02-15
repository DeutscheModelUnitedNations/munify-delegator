import { builder } from '../../builder';
import { db } from '$db/db';
import { calendarDayExportSchema } from '$lib/schemata/calendarDayExport';
import type { CalendarEntryColor } from '@prisma/client';

builder.mutationFields((t) => ({
	importCalendarDay: t.field({
		type: builder.simpleObject('ImportCalendarDayResult', {
			fields: (t) => ({
				id: t.string()
			})
		}),
		args: {
			conferenceId: t.arg.string({ required: true }),
			name: t.arg.string({ required: true }),
			date: t.arg({ type: 'DateTime', required: true }),
			sortOrder: t.arg.int({ required: true }),
			importData: t.arg({ type: 'JSONObject', required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId: args.conferenceId,
					userId: user.sub,
					role: 'PROJECT_MANAGEMENT'
				}
			});

			if (!teamMember) {
				throw new Error('Access denied - requires PROJECT_MANAGEMENT role');
			}

			// JSONObject scalar parseValue may or may not call JSON.parse depending
			// on the transport — handle both string and object values
			const rawData =
				typeof args.importData === 'string'
					? JSON.parse(args.importData as string)
					: args.importData;
			const parsed = calendarDayExportSchema.safeParse(rawData);
			if (!parsed.success) {
				throw new Error(`Invalid import data: ${parsed.error.message}`);
			}

			const importData = parsed.data;

			const day = await db.$transaction(async (tx) => {
				// 1. Create the calendar day
				const newDay = await tx.calendarDay.create({
					data: {
						conferenceId: args.conferenceId,
						name: args.name,
						date: args.date,
						sortOrder: args.sortOrder
					}
				});

				// 2. Create tracks and build name→id map
				const trackNameToId = new Map<string, string>();
				for (const track of importData.tracks) {
					const created = await tx.calendarTrack.create({
						data: {
							calendarDayId: newDay.id,
							name: track.name,
							description: track.description,
							sortOrder: track.sortOrder
						}
					});
					trackNameToId.set(track.name, created.id);
				}

				// 3. Resolve places: reuse existing by conference+name, or create new
				const placeNameToId = new Map<string, string>();
				for (const entry of importData.entries) {
					if (!entry.place || placeNameToId.has(entry.place.name)) continue;

					const existing = await tx.place.findUnique({
						where: {
							conferenceId_name: {
								conferenceId: args.conferenceId,
								name: entry.place.name
							}
						}
					});

					if (existing) {
						placeNameToId.set(entry.place.name, existing.id);
					} else {
						const created = await tx.place.create({
							data: {
								conferenceId: args.conferenceId,
								name: entry.place.name,
								address: entry.place.address,
								latitude: entry.place.latitude,
								longitude: entry.place.longitude,
								directions: entry.place.directions,
								info: entry.place.info,
								websiteUrl: entry.place.websiteUrl
							}
						});
						placeNameToId.set(entry.place.name, created.id);
					}
				}

				// 4. Create entries with remapped track and place IDs
				for (const entry of importData.entries) {
					const [startH, startM] = entry.startTime.split(':').map(Number);
					const [endH, endM] = entry.endTime.split(':').map(Number);

					const startTime = new Date(args.date);
					startTime.setHours(startH, startM, 0, 0);

					const endTime = new Date(args.date);
					endTime.setHours(endH, endM, 0, 0);

					await tx.calendarEntry.create({
						data: {
							calendarDayId: newDay.id,
							name: entry.name,
							description: entry.description,
							startTime,
							endTime,
							fontAwesomeIcon: entry.fontAwesomeIcon,
							color: entry.color as CalendarEntryColor,
							room: entry.room,
							calendarTrackId: entry.trackName
								? (trackNameToId.get(entry.trackName) ?? null)
								: null,
							placeId: entry.place ? (placeNameToId.get(entry.place.name) ?? null) : null
						}
					});
				}

				return newDay;
			});

			return { id: day.id };
		}
	})
}));
