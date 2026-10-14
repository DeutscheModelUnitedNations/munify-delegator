import { db, schema } from '$api/db/db';
import { enum_, object, query, schemaBuilder } from '$api/rumble';
import { eq } from 'drizzle-orm';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { nullToUndefined } from '$api/services/args';
import { setTracks } from './calendarEntryService';
import {
	assertCanCreateCalendarEntry,
	assertCanUpdateCalendarEntry,
	deletableCalendarEntryWhere,
	registerCalendarEntryAbilities
} from './calendarEntryPermissions';
import { calendarEntryPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

registerCalendarEntryAbilities();

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
			await assertCanCreateCalendarEntry(ctx, args);

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
			await assertCanUpdateCalendarEntry(ctx, args);

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
				.where(eq(schema.calendarEntry.id, args.id));

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
				.where(await deletableCalendarEntryWhere(ctx, args.id))
				.returning({ id: schema.calendarEntry.id });

			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			calendarEntryPubsub.removed();

			return true;
		}
	})
}));
