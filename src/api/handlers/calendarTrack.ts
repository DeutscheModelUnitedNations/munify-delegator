import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/calendarTrack.ts
abilityBuilder.calendarTrack.allow('read');
abilityBuilder.calendarTrack.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarTrack.allow(['update', 'delete']).when((ctx) => {
	const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return calendarDay ? { where: { calendarDay } } : undefined;
});

export const CalendarTrackRef = object({ table: 'calendarTrack' });
query({ table: 'calendarTrack' });

schemaBuilder.mutationFields((t) => ({
	createCalendarTrack: t.drizzleField({
		type: CalendarTrackRef,
		args: {
			calendarDayId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			description: t.arg.string(),
			sortOrder: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertMayManageCalendarDay(args.calendarDayId, ctx.oidc.user?.sub);

			const created = await db
				.insert(schema.calendarTrack)
				.values({
					calendarDayId: args.calendarDayId,
					name: args.name,
					description: args.description ?? undefined,
					sortOrder: args.sortOrder
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.calendarTrack
				.findFirst(
					query(
						ctx.abilities.calendarTrack.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarTrack: t.drizzleField({
		type: CalendarTrackRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			description: t.arg.string(),
			sortOrder: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.calendarTrack)
				.set({
					name: args.name ?? undefined,
					description: args.description ?? undefined,
					sortOrder: args.sortOrder ?? undefined
				})
				.where(
					ctx.abilities.calendarTrack.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.calendarTrack
				.findFirst(
					query(
						ctx.abilities.calendarTrack.filter('read').merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarTrack: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.calendarTrack)
				.where(
					ctx.abilities.calendarTrack.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.calendarTrack.id });

			if (deleted.length === 0) {
				throw new GraphQLError('Calendar track not found, or not yours to delete');
			}
			return true;
		}
	})
}));
