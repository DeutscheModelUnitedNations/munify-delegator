import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { nullToUndefined } from '#api/services/args';
import { createCalendarEntry, updateCalendarEntry } from './calendarEntryService';
import {
	assertCanCreateCalendarEntry,
	assertCanUpdateCalendarEntry,
	registerCalendarEntryAbilities
} from './calendarEntryPermissions';
import { calendarEntryPubsub } from '#api/pubsub';
import { deleteIfAllowed, queryAllowed } from '#api/services/authHelper/utils';

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
			placeId: t.arg.id(),
			/** Shows the entry only to those who picked one of these survey options */
			surveyOptionIds: t.arg.idList()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarEntry(ctx, args);

			const created = await createCalendarEntry(
				{
					calendarDayId: args.calendarDayId,
					name: args.name,
					startTime: args.startTime,
					endTime: args.endTime,
					description: nullToUndefined(args.description),
					fontAwesomeIcon: nullToUndefined(args.fontAwesomeIcon),
					color: nullToUndefined(args.color),
					room: nullToUndefined(args.room),
					placeId: nullToUndefined(args.placeId)
				},
				args.calendarTrackIds,
				args.surveyOptionIds
			);

			calendarEntryPubsub.created();

			return db.query.calendarEntry
				.findFirst(query(await queryAllowed(ctx.abilities.calendarEntry, created.id)))
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
			placeId: t.arg.id(),
			/** Shows the entry only to those who picked one of these survey options */
			surveyOptionIds: t.arg.idList()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateCalendarEntry(ctx, args);

			await updateCalendarEntry(
				args.id,
				// An omitted argument arrives as `undefined` and leaves the column alone; an
				// explicit `null` clears it. Only the non-nullable columns coerce null away.
				{
					name: nullToUndefined(args.name),
					startTime: nullToUndefined(args.startTime),
					endTime: nullToUndefined(args.endTime),
					color: nullToUndefined(args.color),
					calendarDayId: nullToUndefined(args.calendarDayId),
					description: args.description,
					fontAwesomeIcon: args.fontAwesomeIcon,
					room: args.room,
					placeId: args.placeId
				},
				args.calendarTrackIds,
				// Omitted keeps the options; an empty list shows the entry to everybody
				args.surveyOptionIds
			);

			calendarEntryPubsub.updated(args.id);

			return db.query.calendarEntry
				.findFirst(query(await queryAllowed(ctx.abilities.calendarEntry, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed(ctx, 'calendarEntry', args.id);
			calendarEntryPubsub.removed();

			return true;
		}
	})
}));
