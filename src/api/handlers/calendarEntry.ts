import { db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { nullToUndefined } from '$api/services/args';

// Ported from abilities/entities/calendarEntry.ts
abilityBuilder.calendarEntry.allow('read');
abilityBuilder.calendarEntry.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
	const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return calendarDay ? { where: { calendarDay } } : undefined;
});

const CalendarEntryRef = object({ table: 'calendarEntry' });
query({ table: 'calendarEntry' });
const pubsub = rumblePubsub({ table: 'calendarEntry' });

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
			calendarTrackId: t.arg.id(),
			placeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertMayManageCalendarDay(args.calendarDayId, ctx.oidc.user?.sub);

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
					calendarTrackId: nullToUndefined(args.calendarTrackId),
					placeId: nullToUndefined(args.placeId)
				})
				.returning()
				.then(assertFirstEntryExists);

			pubsub.created();

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
			calendarTrackId: t.arg.id(),
			placeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
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
					calendarTrackId: args.calendarTrackId,
					placeId: args.placeId
				})
				.where(
					(await ctx.abilities.calendarEntry.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			pubsub.updated(args.id);

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
				throw new GraphQLError('Calendar entry not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));
