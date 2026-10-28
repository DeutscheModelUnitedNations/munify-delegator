import { db, schema } from '#api/db/db.js';
import { object, query, schemaBuilder } from '#api/rumble.js';
import {
	assertCanCreateCalendarTrack,
	registerCalendarTrackAbilities
} from './calendarTrackPermissions';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { inArray } from 'drizzle-orm';
import { calendarEntryPubsub, calendarTrackPubsub } from '#api/pubsub.js';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';
import { assertUpdated, allowedRowWhere, readableById } from '#api/services/authHelper.js';

registerCalendarTrackAbilities();

const CalendarTrackRef = object({ table: 'calendarTrack' });
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
			await assertCanCreateCalendarTrack(ctx, args.calendarDayId);

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

			calendarTrackPubsub.created();

			return db.query.calendarTrack
				.findFirst(query(await readableById(ctx.abilities.calendarTrack, created.id)))
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
			assertUpdated(
				await db
					.update(schema.calendarTrack)
					// `description` is nullable, so an explicit null clears it.
					.set({
						name: args.name ?? undefined,
						sortOrder: args.sortOrder ?? undefined,
						description: args.description
					})
					.where(await allowedRowWhere(ctx, 'calendarTrack', 'update', args.id))
					.returning({ id: schema.calendarTrack.id })
			);

			calendarTrackPubsub.updated(args.id);

			return db.query.calendarTrack
				.findFirst(query(await readableById(ctx.abilities.calendarTrack, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarTrack: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleteFilter = await allowedRowWhere(ctx, 'calendarTrack', 'delete', args.id);

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
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			calendarTrackPubsub.removed();
			if (orphanIds.length > 0) calendarEntryPubsub.removed();

			return true;
		}
	})
}));
