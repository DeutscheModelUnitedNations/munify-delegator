import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageConference,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { calendarDayExportSchema } from '$lib/schemata/calendarDayExport';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/calendarDay.ts
abilityBuilder.calendarDay.allow('read');
abilityBuilder.calendarDay.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarDay.allow(['update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

export const CalendarDayRef = object({ table: 'calendarDay' });
query({ table: 'calendarDay' });

schemaBuilder.mutationFields((t) => ({
	createCalendarDay: t.drizzleField({
		type: CalendarDayRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			date: t.arg({ type: 'DateTime', required: true }),
			sortOrder: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertMayManageConference(args.conferenceId, ctx.oidc.user?.sub);

			const created = await db
				.insert(schema.calendarDay)
				.values({
					conferenceId: args.conferenceId,
					name: args.name,
					date: args.date,
					sortOrder: args.sortOrder
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.calendarDay
				.findFirst(
					query(
						ctx.abilities.calendarDay.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarDay: t.drizzleField({
		type: CalendarDayRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			date: t.arg({ type: 'DateTime' }),
			sortOrder: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.calendarDay)
				.set({
					name: args.name ?? undefined,
					date: args.date ?? undefined,
					sortOrder: args.sortOrder ?? undefined
				})
				.where(
					ctx.abilities.calendarDay.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.calendarDay
				.findFirst(
					query(
						ctx.abilities.calendarDay.filter('read').merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarDay: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.calendarDay)
				.where(
					ctx.abilities.calendarDay.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.calendarDay.id });

			if (deleted.length === 0) {
				throw new GraphQLError('Calendar day not found, or not yours to delete');
			}
			return true;
		}
	})
}));

/**
 * Imports a whole day - tracks, places and entries - from an exported JSON document.
 *
 * Places are matched by name within the conference and reused when they already exist, so
 * importing the same day twice does not duplicate venues. Entry times arrive as "HH:MM" and are
 * anchored to the target date in UTC.
 */
schemaBuilder.mutationFields((t) => ({
	importCalendarDay: t.drizzleField({
		type: CalendarDayRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			date: t.arg({ type: 'DateTime', required: true }),
			sortOrder: t.arg.int({ required: true }),
			importData: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertMayManageConference(args.conferenceId, ctx.oidc.user?.sub);

			const raw =
				typeof args.importData === 'string'
					? (() => {
							try {
								return JSON.parse(args.importData);
							} catch {
								throw new GraphQLError('Invalid import data: malformed JSON');
							}
						})()
					: args.importData;

			const parsed = calendarDayExportSchema.safeParse(raw);
			if (!parsed.success) {
				throw new GraphQLError(`Invalid import data: ${parsed.error.message}`);
			}
			const importData = parsed.data;

			const created = await db.transaction(async (tx) => {
				const day = await tx
					.insert(schema.calendarDay)
					.values({
						conferenceId: args.conferenceId,
						name: args.name,
						date: args.date,
						sortOrder: args.sortOrder
					})
					.returning()
					.then(assertFirstEntryExists);

				const trackIdByName = new Map<string, string>();
				for (const track of importData.tracks) {
					const row = await tx
						.insert(schema.calendarTrack)
						.values({
							calendarDayId: day.id,
							name: track.name,
							description: track.description,
							sortOrder: track.sortOrder
						})
						.returning()
						.then(assertFirstEntryExists);
					trackIdByName.set(track.name, row.id);
				}

				const placeIdByName = new Map<string, string>();
				for (const entry of importData.entries) {
					if (!entry.place || placeIdByName.has(entry.place.name)) continue;

					const existing = await tx.query.place.findFirst({
						where: { conferenceId: args.conferenceId, name: entry.place.name }
					});
					if (existing) {
						placeIdByName.set(entry.place.name, existing.id);
						continue;
					}

					const row = await tx
						.insert(schema.place)
						.values({
							conferenceId: args.conferenceId,
							name: entry.place.name,
							address: entry.place.address,
							latitude: entry.place.latitude,
							longitude: entry.place.longitude,
							directions: entry.place.directions,
							info: entry.place.info,
							websiteUrl: entry.place.websiteUrl
						})
						.returning()
						.then(assertFirstEntryExists);
					placeIdByName.set(entry.place.name, row.id);
				}

				for (const entry of importData.entries) {
					const [startHour, startMinute] = entry.startTime.split(':').map(Number);
					const [endHour, endMinute] = entry.endTime.split(':').map(Number);
					const startTime = new Date(args.date);
					startTime.setUTCHours(startHour ?? 0, startMinute ?? 0, 0, 0);
					const endTime = new Date(args.date);
					endTime.setUTCHours(endHour ?? 0, endMinute ?? 0, 0, 0);

					await tx.insert(schema.calendarEntry).values({
						calendarDayId: day.id,
						name: entry.name,
						description: entry.description,
						startTime,
						endTime,
						fontAwesomeIcon: entry.fontAwesomeIcon,
						color: entry.color,
						room: entry.room,
						calendarTrackId: entry.trackName ? (trackIdByName.get(entry.trackName) ?? null) : null,
						placeId: entry.place ? (placeIdByName.get(entry.place.name) ?? null) : null
					});
				}

				return day;
			});

			return db.query.calendarDay
				.findFirst(
					query(
						ctx.abilities.calendarDay.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
