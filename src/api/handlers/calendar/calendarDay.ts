import { db, schema } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreateCalendarDay,
	assertCanManageCalendarDay,
	registerCalendarDayAbilities
} from './calendarDayPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { calendarDayPubsub } from '#api/pubsub';
import { updateIfAllowed } from '#api/services/authHelper/utils';
import { deleteCalendarDay } from './calendarDayService';

registerCalendarDayAbilities();

const CalendarDayRef = object({ table: 'calendarDay' });
query({ table: 'calendarDay' });

/** The query for day `id` as the caller may read it, to return a row after writing it. */
async function readableDayQuery({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.calendarDay.filter('read')).merge({ where: { id } }).query.single;
}

schemaBuilder.mutationFields((t) => ({
	createCalendarDay: t.drizzleField({
		description: "Adds an empty day to the conference's schedule.",
		type: CalendarDayRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			date: t.arg({ type: 'Date', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarDay({ ctx, conferenceId: args.conferenceId });

			const created = await db
				.insert(schema.calendarDay)
				.values({
					conferenceId: args.conferenceId,
					name: args.name,
					date: args.date
				})
				.returning()
				.then(assertFirstEntryExists);

			calendarDayPubsub.created();

			return db.query.calendarDay
				.findFirst(query(await readableDayQuery({ ctx, id: created.id })))
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarDay: t.drizzleField({
		description: 'Changes the given fields of a schedule day; the others stay as they are.',
		type: CalendarDayRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			date: t.arg({ type: 'Date' })
		},
		resolve: async (query, _root, args, ctx) => {
			await updateIfAllowed({
				ctx,
				table: 'calendarDay',
				id: args.id,
				values: {
					name: args.name ?? undefined,
					date: args.date ?? undefined
				}
			});

			calendarDayPubsub.updated(args.id);

			return db.query.calendarDay
				.findFirst(query(await readableDayQuery({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarDay: t.field({
		description:
			"Deletes a schedule day together with its entries. The tracks are the conference's and stay; they no longer run on it. NOT_FOUND for a day the caller may not manage.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanManageCalendarDay({ ctx, calendarDayId: args.id });
			await deleteCalendarDay(args.id);
			return true;
		}
	})
}));
