import { db, schema } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertCanCreateCalendarDay, registerCalendarDayAbilities } from './calendarDayPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { createImportedDay, importDataSchema } from './calendarDayService';
import { calendarDayPubsub } from '#api/pubsub';
import { deleteIfAllowed, updateIfAllowed } from '#api/services/authHelper/utils';

registerCalendarDayAbilities();

const CalendarDayRef = object({ table: 'calendarDay' });
query({ table: 'calendarDay' });

/** The calendar day with this id, as far as the caller may read it. */
const readableDay = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id } }).query.single;

type InputFieldBuilder = PothosSchemaTypes.InputFieldBuilder<
	(typeof schemaBuilder)['$inferSchemaTypes'],
	'Arg'
>;

/** What a new day needs, whether it starts empty or is imported. */
const newDayArgs = (
	arg: Pick<InputFieldBuilder, 'id' | 'string' | 'int'> & InputFieldBuilder['field']
) => ({
	conferenceId: arg.id({ required: true }),
	name: arg.string({ required: true }),
	date: arg({ type: 'DateTime', required: true }),
	sortOrder: arg.int({ required: true })
});

schemaBuilder.mutationFields((t) => ({
	createCalendarDay: t.drizzleField({
		type: CalendarDayRef,
		args: {
			...newDayArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarDay({ ctx, conferenceId: args.conferenceId });

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

			calendarDayPubsub.created();

			return db.query.calendarDay
				.findFirst(query(await readableDay({ ctx, id: created.id })))
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
			await updateIfAllowed({
				ctx,
				table: 'calendarDay',
				id: args.id,
				values: {
					name: args.name ?? undefined,
					date: args.date ?? undefined,
					sortOrder: args.sortOrder ?? undefined
				}
			});

			calendarDayPubsub.updated(args.id);

			return db.query.calendarDay
				.findFirst(query(await readableDay({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarDay: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'calendarDay', id: args.id });
			calendarDayPubsub.removed();

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
			...newDayArgs(t.arg),
			importData: t.arg({ type: 'JSON', required: true }).validate(importDataSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarDay({ ctx, conferenceId: args.conferenceId });

			const created = await createImportedDay({ args, importData: args.importData });

			return db.query.calendarDay
				.findFirst(query(await readableDay({ ctx, id: created.id })))
				.then(assertFindFirstExists);
		}
	})
}));
