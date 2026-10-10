import { type Transaction, db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import {
	type CalendarDayExportData,
	calendarDayExportSchema
} from '$lib/schemata/calendarDayExport';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/calendarDay.ts
abilityBuilder.calendarDay.allow('read');
abilityBuilder.calendarDay.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarDay
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

const CalendarDayRef = object({ table: 'calendarDay' });
query({ table: 'calendarDay' });
const pubsub = rumblePubsub({ table: 'calendarDay' });
// An import brings a whole day's programme with it: its tracks, its entries and their places.
const calendarTrackPubsub = rumblePubsub({ table: 'calendarTrack' });
const calendarEntryPubsub = rumblePubsub({ table: 'calendarEntry' });
const placePubsub = rumblePubsub({ table: 'place' });

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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

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

			pubsub.created();

			return db.query.calendarDay
				.findFirst(
					query(
						(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id: created.id } })
							.query.single
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
					(await ctx.abilities.calendarDay.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			pubsub.updated(args.id);

			return db.query.calendarDay
				.findFirst(
					query(
						(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id: args.id } }).query
							.single
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
					(await ctx.abilities.calendarDay.filter('delete')).merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.calendarDay.id });

			if (deleted.length === 0) {
				throw new GraphQLError('Calendar day not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));

/** The import document arrives either as a JSON string or already parsed. */
function parseImportData(importData: unknown) {
	let raw = importData;
	if (typeof importData === 'string') {
		try {
			raw = JSON.parse(importData);
		} catch {
			throw new GraphQLError('Invalid import data: malformed JSON');
		}
	}

	const parsed = calendarDayExportSchema.safeParse(raw);
	if (!parsed.success) {
		throw new GraphQLError(`Invalid import data: ${parsed.error.message}`);
	}
	return parsed.data;
}

/** Creates the day's tracks and maps each track name to its new id. */
async function importTracks(
	tx: Transaction,
	dayId: string,
	tracks: CalendarDayExportData['tracks']
) {
	const trackIdByName = new Map<string, string>();
	for (const track of tracks) {
		const row = await tx
			.insert(schema.calendarTrack)
			.values({
				calendarDayId: dayId,
				name: track.name,
				description: track.description,
				sortOrder: track.sortOrder
			})
			.returning()
			.then(assertFirstEntryExists);
		trackIdByName.set(track.name, row.id);
	}
	return trackIdByName;
}

/** The places the entries name, each once: the first entry naming a place describes it. */
function distinctPlaces(entries: CalendarDayExportData['entries']) {
	const byName = new Map<string, NonNullable<CalendarDayExportData['entries'][number]['place']>>();
	for (const entry of entries) {
		if (entry.place && !byName.has(entry.place.name)) byName.set(entry.place.name, entry.place);
	}
	return [...byName.values()];
}

/** Maps each place the entries name to its id, reusing a place the conference already has. */
async function importPlaces(
	tx: Transaction,
	conferenceId: string,
	entries: CalendarDayExportData['entries']
) {
	const placeIdByName = new Map<string, string>();
	for (const place of distinctPlaces(entries)) {
		const existing = await tx.query.place.findFirst({
			where: { conferenceId, name: place.name }
		});
		if (existing) {
			placeIdByName.set(place.name, existing.id);
			continue;
		}

		const row = await tx
			.insert(schema.place)
			.values({
				conferenceId,
				name: place.name,
				address: place.address,
				latitude: place.latitude,
				longitude: place.longitude,
				directions: place.directions,
				info: place.info,
				websiteUrl: place.websiteUrl
			})
			.returning()
			.then(assertFirstEntryExists);
		placeIdByName.set(place.name, row.id);
	}
	return placeIdByName;
}

/** An "HH:MM" time anchored to the given date in UTC. */
function timeOnDay(date: Date, time: string) {
	const [hour, minute] = time.split(':').map(Number);
	const result = new Date(date);
	result.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
	return result;
}

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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			const importData = parseImportData(args.importData);

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

				const trackIdByName = await importTracks(tx, day.id, importData.tracks);
				const placeIdByName = await importPlaces(tx, args.conferenceId, importData.entries);

				for (const entry of importData.entries) {
					const created = await tx
						.insert(schema.calendarEntry)
						.values({
							calendarDayId: day.id,
							name: entry.name,
							description: entry.description,
							startTime: timeOnDay(args.date, entry.startTime),
							endTime: timeOnDay(args.date, entry.endTime),
							fontAwesomeIcon: entry.fontAwesomeIcon,
							color: entry.color,
							room: entry.room,
							placeId: entry.place ? (placeIdByName.get(entry.place.name) ?? null) : null
						})
						.returning()
						.then(assertFirstEntryExists);
					// Files from before an entry named its tracks leave them out for "all tracks"
					const trackIds =
						entry.trackNames.length === 0
							? [...trackIdByName.values()]
							: entry.trackNames.flatMap((name) => trackIdByName.get(name) ?? []);
					if (trackIds.length > 0) {
						await tx
							.insert(schema.calendarEntryToCalendarTrack)
							.values(trackIds.map((trackId) => ({ a: created.id, b: trackId })));
					}
				}

				return day;
			});

			pubsub.created();
			calendarTrackPubsub.created();
			calendarEntryPubsub.created();
			placePubsub.created();

			return db.query.calendarDay
				.findFirst(
					query(
						(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
