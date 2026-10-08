import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/calendarTrack.ts
abilityBuilder.calendarTrack.allow('read');
abilityBuilder.calendarTrack.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarTrack.allow(['update', 'delete']).when((ctx) => {
	const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return calendarDay ? { where: { calendarDay } } : undefined;
});

const CalendarTrackRef = object({ table: 'calendarTrack' });
query({ table: 'calendarTrack' });
const pubsub = rumblePubsub({ table: 'calendarTrack' });
const entryPubsub = rumblePubsub({ table: 'calendarEntry' });

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
			await assertTeamRoleForCalendarDay(ctx, args.calendarDayId);

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

			pubsub.created();

			return db.query.calendarTrack
				.findFirst(
					query(
						(await ctx.abilities.calendarTrack.filter('read')).merge({ where: { id: created.id } })
							.query.single
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
				// `description` is nullable, so an explicit null clears it.
				.set({
					name: args.name ?? undefined,
					sortOrder: args.sortOrder ?? undefined,
					description: args.description
				})
				.where(
					(await ctx.abilities.calendarTrack.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			pubsub.updated(args.id);

			return db.query.calendarTrack
				.findFirst(
					query(
						(await ctx.abilities.calendarTrack.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarTrack: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleteFilter = (await ctx.abilities.calendarTrack.filter('delete')).merge({
				where: { id: args.id }
			}).sql.where;

			// Entries that run on this track alone would be left without one, so they go with it
			const linked = await db.query.calendarEntry.findMany({
				where: { tracks: { id: args.id } },
				columns: { id: true },
				with: { tracks: { columns: { id: true } } }
			});
			const orphanIds = linked.filter((entry) => entry.tracks.length === 1).map((e) => e.id);

			const deleted = await db.transaction(async (tx) => {
				const rows = await tx
					.delete(schema.calendarTrack)
					.where(deleteFilter)
					.returning({ id: schema.calendarTrack.id });
				if (rows.length > 0 && orphanIds.length > 0) {
					await tx.delete(schema.calendarEntry).where(inArray(schema.calendarEntry.id, orphanIds));
				}
				return rows;
			});

			if (deleted.length === 0) {
				throw new GraphQLError('Calendar track not found, or not yours to delete');
			}
			pubsub.removed();
			if (orphanIds.length > 0) entryPubsub.removed();

			return true;
		}
	})
}));
