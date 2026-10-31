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
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerCalendarEntryAbilities();

const CalendarEntryRef = object({ table: 'calendarEntry' });
query({ table: 'calendarEntry' });

const calendarEntryColorEnum = enum_({ tsName: 'calendarEntryColor' });

schemaBuilder.mutationFields((t) => ({
	createCalendarEntry: t.drizzleField({
		description:
			'Adds an entry to a schedule day, on the given tracks; with `surveyOptionIds` only those who picked one of them (and the team) see it.',
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
			await assertCanCreateCalendarEntry({ ctx, args });

			const created = await createCalendarEntry({
				values: {
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
				trackIds: args.calendarTrackIds,
				surveyOptionIds: args.surveyOptionIds
			});

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
		description:
			'Changes the given fields of a schedule entry; the others stay as they are, `null` clears a nullable one. An empty `surveyOptionIds` shows the entry to everybody again.',
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
			await assertCanUpdateCalendarEntry({ ctx, args });

			await updateCalendarEntry({
				id: args.id,
				// An omitted argument arrives as `undefined` and leaves the column alone; an
				// explicit `null` clears it. Only the non-nullable columns coerce null away.
				values: {
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
				trackIds: args.calendarTrackIds,
				// Omitted keeps the options; an empty list shows the entry to everybody
				surveyOptionIds: args.surveyOptionIds
			});

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
		description: 'Deletes a schedule entry.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'calendarEntry', id: args.id });
			calendarEntryPubsub.removed();

			return true;
		}
	})
}));
