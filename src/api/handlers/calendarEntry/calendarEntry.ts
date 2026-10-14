import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { nullToUndefined } from '$api/services/args';
import { assertReferences, setTracks } from './calendarEntryService';
import { calendarEntryPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/calendarEntry.ts
abilityBuilder.calendarEntry.allow('read');
abilityBuilder.calendarEntry.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
	const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return calendarDay ? { where: { calendarDay } } : undefined;
});

const CalendarEntryRef = object({ table: 'calendarEntry' });
query({ table: 'calendarEntry' });

const calendarEntryColorEnum = enum_({ tsName: 'calendarEntryColor' });

schemaBuilder.mutationFields((t) => ({
	createCalendarEntry: t.drizzleField({
		type: CalendarEntryRef,
		args: {
			calendarDayId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			startTime: t.arg({ type: 'DateTime', required: true }),
			endTime: t.arg({ type: 'DateTime', required: true }),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			color: t.arg({ type: calendarEntryColorEnum }),
			room: t.arg.string(),
			calendarTrackIds: t.arg.idList(),
			placeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			const day = await assertTeamRoleForCalendarDay(ctx, args.calendarDayId);
			await assertReferences(day.conferenceId, {
				calendarDayId: args.calendarDayId,
				calendarTrackIds: args.calendarTrackIds ?? [],
				placeId: args.placeId
			});

			const created = await db
				.insert(schema.calendarEntry)
				.values({
					calendarDayId: args.calendarDayId,
					name: args.name,
					startTime: args.startTime,
					endTime: args.endTime,
					description: nullToUndefined(args.description),
					fontAwesomeIcon: nullToUndefined(args.fontAwesomeIcon),
					color: nullToUndefined(args.color),
					room: nullToUndefined(args.room),
					placeId: nullToUndefined(args.placeId)
				})
				.returning()
				.then(assertFirstEntryExists);
			if (args.calendarTrackIds?.length) await setTracks(created.id, args.calendarTrackIds);

			calendarEntryPubsub.created();

			return db.query.calendarEntry
				.findFirst(
					query(
						(await ctx.abilities.calendarEntry.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarEntry: t.drizzleField({
		type: CalendarEntryRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			startTime: t.arg({ type: 'DateTime' }),
			endTime: t.arg({ type: 'DateTime' }),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			color: t.arg({ type: calendarEntryColorEnum }),
			room: t.arg.string(),
			calendarDayId: t.arg.id(),
			calendarTrackIds: t.arg.idList(),
			placeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			const entry = await db.query.calendarEntry
				.findFirst({
					...(await ctx.abilities.calendarEntry.filter('update')).merge({ where: { id: args.id } })
						.query.single,
					columns: { calendarDayId: true },
					with: {
						calendarDay: { columns: { conferenceId: true } },
						tracks: { columns: { id: true } }
					}
				})
				.then(assertFindFirstExists);
			const calendarDayId = args.calendarDayId ?? entry.calendarDayId;
			await assertReferences(entry.calendarDay.conferenceId, {
				calendarDayId,
				// Moving to another day takes the tracks along only if they are that day's too.
				calendarTrackIds: args.calendarTrackIds ?? entry.tracks.map((track) => track.id),
				placeId: args.placeId
			});

			await db
				.update(schema.calendarEntry)
				// An omitted argument arrives as `undefined` and leaves the column alone; an
				// explicit `null` clears it. Only the non-nullable columns coerce null away.
				.set({
					name: nullToUndefined(args.name),
					startTime: nullToUndefined(args.startTime),
					endTime: nullToUndefined(args.endTime),
					color: nullToUndefined(args.color),
					calendarDayId: nullToUndefined(args.calendarDayId),
					description: args.description,
					fontAwesomeIcon: args.fontAwesomeIcon,
					room: args.room,
					placeId: args.placeId
				})
				.where(
					(await ctx.abilities.calendarEntry.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			if (args.calendarTrackIds) await setTracks(args.id, args.calendarTrackIds);

			calendarEntryPubsub.updated(args.id);

			return db.query.calendarEntry
				.findFirst(
					query(
						(await ctx.abilities.calendarEntry.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.calendarEntry)
				.where(
					(await ctx.abilities.calendarEntry.filter('delete')).merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.calendarEntry.id });

			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			calendarEntryPubsub.removed();

			return true;
		}
	})
}));
