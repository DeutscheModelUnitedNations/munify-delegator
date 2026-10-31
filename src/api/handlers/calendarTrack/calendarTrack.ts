import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreateCalendarTrack,
	assertCanUpdateCalendarTrack,
	registerCalendarTrackAbilities
} from './calendarTrackPermissions';
import {
	createCalendarTrack,
	deleteCalendarTrack,
	setCalendarTrackOnDay,
	updateCalendarTrack
} from './calendarTrackService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { assertAllowed } from '#api/services/authHelper/utils';

registerCalendarTrackAbilities();

const CalendarTrackRef = object({ table: 'calendarTrack' });
query({ table: 'calendarTrack' });

async function readableTrack({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.calendarTrack.filter('read')).merge({ where: { id } }).query.single;
}

schemaBuilder.mutationFields((t) => ({
	createCalendarTrack: t.drizzleField({
		description:
			'Adds a track, a parallel strand of the programme, to the conference, running on the given days and meant for the given committees and roles.',
		type: CalendarTrackRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			description: t.arg.string(),
			sortOrder: t.arg.int({ required: true }),
			calendarDayIds: t.arg.idList(),
			committeeIds: t.arg.idList(),
			conferenceRoleIds: t.arg.idList()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarTrack({ ctx, conferenceId: args.conferenceId, refs: args });

			const created = await createCalendarTrack({
				values: {
					conferenceId: args.conferenceId,
					name: args.name,
					description: args.description ?? undefined,
					sortOrder: args.sortOrder
				},
				calendarDayIds: args.calendarDayIds ?? [],
				seats: args
			});

			return db.query.calendarTrack
				.findFirst(query(await readableTrack({ ctx, id: created.id })))
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarTrack: t.drizzleField({
		description:
			'Changes the given fields of a track; the others stay as they are, `null` clears the description. Given `committeeIds` / `conferenceRoleIds` replace whom the track is for.',
		type: CalendarTrackRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			description: t.arg.string(),
			sortOrder: t.arg.int(),
			committeeIds: t.arg.idList(),
			conferenceRoleIds: t.arg.idList()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateCalendarTrack({ ctx, id: args.id, refs: args });

			// `description` is nullable, so an explicit null clears it.
			await updateCalendarTrack({
				id: args.id,
				values: {
					name: args.name ?? undefined,
					sortOrder: args.sortOrder ?? undefined,
					description: args.description
				},
				seats: args
			});

			return db.query.calendarTrack
				.findFirst(query(await readableTrack({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	setCalendarTrackOnDay: t.field({
		description:
			"Lets a track run on a day, or takes it off the day; the day's entries that ran on this track alone go with it.",
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			calendarDayId: t.arg.id({ required: true }),
			runs: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanUpdateCalendarTrack({
				ctx,
				id: args.id,
				refs: { calendarDayIds: [args.calendarDayId] }
			});
			await setCalendarTrackOnDay({
				trackId: args.id,
				calendarDayId: args.calendarDayId,
				runs: args.runs
			});
			return true;
		}
	}),

	deleteCalendarTrack: t.field({
		description:
			'Deletes a track from every day; entries that ran on this track alone go with it, entries on others stay.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertAllowed({ ctx, table: 'calendarTrack', action: 'delete', id: args.id });
			await deleteCalendarTrack(args.id);
			return true;
		}
	})
}));
