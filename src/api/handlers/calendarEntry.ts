import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/calendarEntry.ts
abilityBuilder.calendarEntry.allow('read');
abilityBuilder.calendarEntry.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
	const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return calendarDay ? { where: { calendarDay } } : undefined;
});

export const CalendarEntryRef = object({ table: 'calendarEntry' });
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
					description: args.description ?? undefined,
					fontAwesomeIcon: args.fontAwesomeIcon ?? undefined,
					color: args.color ?? undefined,
					room: args.room ?? undefined,
					calendarTrackId: args.calendarTrackId ?? undefined,
					placeId: args.placeId ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.calendarEntry
				.findFirst(
					query(
						ctx.abilities.calendarEntry.filter('read').merge({ where: { id: created.id } }).query
							.single
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
			calendarTrackId: t.arg.id(),
			placeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.calendarEntry)
				.set({
					name: args.name ?? undefined,
					startTime: args.startTime ?? undefined,
					endTime: args.endTime ?? undefined,
					description: args.description ?? undefined,
					fontAwesomeIcon: args.fontAwesomeIcon ?? undefined,
					color: args.color ?? undefined,
					room: args.room ?? undefined,
					calendarTrackId: args.calendarTrackId ?? undefined,
					placeId: args.placeId ?? undefined
				})
				.where(
					ctx.abilities.calendarEntry.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.calendarEntry
				.findFirst(
					query(
						ctx.abilities.calendarEntry.filter('read').merge({ where: { id: args.id } }).query
							.single
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
					ctx.abilities.calendarEntry.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.calendarEntry.id });

			if (deleted.length === 0) {
				throw new GraphQLError('Calendar entry not found, or not yours to delete');
			}
			return true;
		}
	})
}));
