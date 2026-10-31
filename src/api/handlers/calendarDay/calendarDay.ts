import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreateCalendarDay,
	assertCanManageCalendarDay,
	registerCalendarDayAbilities
} from './calendarDayPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	createCalendarDay,
	createImportedDay,
	deleteCalendarDay,
	importDataSchema,
	updateCalendarDay
} from './calendarDayService';

registerCalendarDayAbilities();

const CalendarDayRef = object({ table: 'calendarDay' });
query({ table: 'calendarDay' });

/** The calendar day with this id, as far as the caller may read it. */
const readableDay = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id } }).query.single;

/** What the descriptions say about where a day goes. */
const placement =
	"The day is placed among the conference's days by its date; a day placed at the same moment can take its place first, which answers CONFLICT.";

schemaBuilder.mutationFields((t) => {
	/** What a new day needs, whether it starts empty or is imported. */
	const newDayArgs = () => ({
		conferenceId: t.arg.id({ required: true }),
		name: t.arg.string({ required: true }),
		date: t.arg({ type: 'DateTime', required: true })
	});

	return {
		createCalendarDay: t.drizzleField({
			description: `Adds an empty day to the conference's schedule. ${placement}`,
			type: CalendarDayRef,
			args: newDayArgs(),
			resolve: async (query, _root, args, ctx) => {
				await assertCanCreateCalendarDay({ ctx, conferenceId: args.conferenceId });
				const id = await createCalendarDay(args);

				return db.query.calendarDay
					.findFirst(query(await readableDay({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		importCalendarDay: t.drizzleField({
			description: `Imports a whole day - tracks, places and entries - from an exported JSON document. Places and tracks are matched by name within the conference and reused, so importing a day twice duplicates neither venues nor tracks; entry times ("HH:MM") are anchored to the date in UTC. A malformed document is refused with INVALID_INPUT. ${placement}`,
			type: CalendarDayRef,
			args: {
				...newDayArgs(),
				importData: t.arg({ type: 'JSON', required: true }).validate(importDataSchema)
			},
			resolve: async (query, _root, { importData, ...day }, ctx) => {
				await assertCanCreateCalendarDay({ ctx, conferenceId: day.conferenceId });
				const id = await createImportedDay({ day, importData });

				return db.query.calendarDay
					.findFirst(query(await readableDay({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		updateCalendarDay: t.drizzleField({
			description: `Changes the given fields of a schedule day; left out or \`null\` keeps a field. A day given another date is placed anew. ${placement}`,
			type: CalendarDayRef,
			args: {
				id: t.arg.id({ required: true }),
				name: t.arg.string(),
				date: t.arg({ type: 'DateTime' })
			},
			resolve: async (query, _root, args, ctx) => {
				const day = await assertCanManageCalendarDay({ ctx, calendarDayId: args.id });
				await updateCalendarDay({ day: { id: args.id, ...day }, name: args.name, date: args.date });

				return db.query.calendarDay
					.findFirst(query(await readableDay({ ctx, id: args.id })))
					.then(assertFindFirstExists);
			}
		}),

		deleteCalendarDay: t.field({
			description:
				"Deletes a schedule day with its entries; the conference's tracks stay and no longer run on it.",
			type: 'Boolean',
			args: { id: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				await assertCanManageCalendarDay({ ctx, calendarDayId: args.id });
				await deleteCalendarDay(args.id);
				return true;
			}
		})
	};
});
