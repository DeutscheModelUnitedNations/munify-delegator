import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
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
import { entryTimesSchema, entryTrackIdsSchema } from './entryRules';

registerCalendarEntryAbilities();

const CalendarEntryRef = object({ table: 'calendarEntry' });
query({ table: 'calendarEntry' });

const calendarEntryColorEnum = enum_({ tsName: 'calendarEntryColor' });

/** The entry as the caller may read it, for re-reading the row a mutation wrote. */
async function readableEntry({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.calendarEntry.filter('read')).merge({ where: { id } }).query.single;
}

const surveyOptionsDescription =
	'Shows the entry only to those who picked one of these survey options of the conference (and to the team).';

schemaBuilder.mutationFields((t) => ({
	createCalendarEntry: t.drizzleField({
		description:
			"Adds an entry to a schedule day, on the given tracks of the day. An entry ending before it starts, without a track, or naming a track, place or survey option that is not the day's conference's is refused with INVALID_INPUT.",
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
			calendarTrackIds: t.arg
				.idList({ required: true, description: 'Tracks of the day; at least one.' })
				.validate(entryTrackIdsSchema),
			placeId: t.arg.id(),
			surveyOptionIds: t.arg.idList({ description: surveyOptionsDescription })
		},
		validate: entryTimesSchema,
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarEntry({ ctx, calendarDayId: args.calendarDayId });

			const createdId = await createCalendarEntry({
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
				.findFirst(query(await readableEntry({ ctx, id: createdId })))
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarEntry: t.drizzleField({
		description:
			"Changes the given fields of a schedule entry; left out keeps a field, `null` clears a nullable one. An entry ending before it starts as written, an empty track list, or a day, track, place or survey option that is not the entry's conference's is refused with INVALID_INPUT; moving to another day keeps the tracks only if that day has them too.",
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
			calendarTrackIds: t.arg
				.idList({ description: 'Replaces the tracks; left out keeps them.' })
				.validate(entryTrackIdsSchema.nullish()),
			placeId: t.arg.id(),
			surveyOptionIds: t.arg.idList({
				description: `${surveyOptionsDescription} Left out keeps them, an empty list shows the entry to everybody again.`
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateCalendarEntry({ ctx, id: args.id });

			await updateCalendarEntry({
				id: args.id,
				// Left out leaves a column alone, `null` clears it; non-null columns ignore `null`.
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
				surveyOptionIds: args.surveyOptionIds
			});

			return db.query.calendarEntry
				.findFirst(query(await readableEntry({ ctx, id: args.id })))
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
