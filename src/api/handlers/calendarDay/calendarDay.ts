import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { createImportedDay, parseImportData } from './calendarDayService';
import {
	calendarDayPubsub,
	calendarEntryPubsub,
	calendarTrackPubsub,
	placePubsub
} from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/calendarDay.ts
abilityBuilder.calendarDay.allow('read');
abilityBuilder.calendarDay.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.calendarDay
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

const CalendarDayRef = object({ table: 'calendarDay' });
query({ table: 'calendarDay' });
schemaBuilder.mutationFields((t) => ({
	createCalendarDay: t.drizzleField({
		type: CalendarDayRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			date: t.arg({ type: 'DateTime', required: true }),
			sortOrder: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

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
				.findFirst(
					query(
						(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
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
			await db
				.update(schema.calendarDay)
				.set({
					name: args.name ?? undefined,
					date: args.date ?? undefined,
					sortOrder: args.sortOrder ?? undefined
				})
				.where(
					(await ctx.abilities.calendarDay.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			calendarDayPubsub.updated(args.id);

			return db.query.calendarDay
				.findFirst(
					query(
						(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCalendarDay: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.calendarDay)
				.where(
					(await ctx.abilities.calendarDay.filter('delete')).merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.calendarDay.id });

			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
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
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			date: t.arg({ type: 'DateTime', required: true }),
			sortOrder: t.arg.int({ required: true }),
			importData: t.arg({ type: 'JSON', required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			const importData = parseImportData(args.importData);

			const created = await createImportedDay(args, importData);

			calendarDayPubsub.created();
			calendarTrackPubsub.created();
			calendarEntryPubsub.created();
			placePubsub.created();

			return db.query.calendarDay
				.findFirst(
					query(
						(await ctx.abilities.calendarDay.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
