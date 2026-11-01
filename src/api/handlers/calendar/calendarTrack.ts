import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreateCalendarTrack,
	assertCanDeleteCalendarTrack,
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

registerCalendarTrackAbilities();

const CalendarTrackRef = object({ table: 'calendarTrack' });
query({ table: 'calendarTrack' });

/** The track as the caller may read it, for re-reading the row a mutation wrote. */
async function readableTrack({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.calendarTrack.filter('read')).merge({ where: { id } }).query.single;
}

const committeesDescription = 'The committees whose members the track is for.';
const rolesDescription =
	'The roles (nations, non-state actors, custom roles) whose holders it is for.';

schemaBuilder.mutationFields((t) => ({
	createCalendarTrack: t.drizzleField({
		description:
			'Adds a track, a parallel strand of the programme, to the conference, running on the given days and meant for the given committees and roles. A name another track of the conference has is refused with CONFLICT; a day, committee or role of another conference with INVALID_INPUT.',
		type: CalendarTrackRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			description: t.arg.string(),
			sortOrder: t.arg.int({
				required: true,
				description: 'Where the track goes among the others.'
			}),
			calendarDayIds: t.arg.idList({ description: 'The days it runs on.' }),
			committeeIds: t.arg.idList({ description: committeesDescription }),
			conferenceRoleIds: t.arg.idList({ description: rolesDescription })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCalendarTrack({ ctx, conferenceId: args.conferenceId });

			const id = await createCalendarTrack({
				values: {
					conferenceId: args.conferenceId,
					name: args.name,
					description: args.description ?? undefined,
					sortOrder: args.sortOrder
				},
				calendarDayIds: args.calendarDayIds ?? [],
				audience: args
			});

			return db.query.calendarTrack
				.findFirst(query(await readableTrack({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateCalendarTrack: t.drizzleField({
		description:
			'Changes the given fields of a track; left out or `null` keeps a field, `null` clears the description. Given `committeeIds` / `conferenceRoleIds` replace whom the track is for. A name another track of the conference has is refused with CONFLICT; a committee or role of another conference with INVALID_INPUT.',
		type: CalendarTrackRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			description: t.arg.string(),
			sortOrder: t.arg.int(),
			committeeIds: t.arg.idList({ description: `${committeesDescription} Left out keeps them.` }),
			conferenceRoleIds: t.arg.idList({ description: `${rolesDescription} Left out keeps them.` })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateCalendarTrack({ ctx, id: args.id });

			// `description` is nullable, so an explicit null clears it.
			await updateCalendarTrack({
				id: args.id,
				values: {
					name: args.name ?? undefined,
					sortOrder: args.sortOrder ?? undefined,
					description: args.description
				},
				audience: args
			});

			return db.query.calendarTrack
				.findFirst(query(await readableTrack({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	setCalendarTrackOnDay: t.field({
		description:
			"Lets a track run on a day of its conference, or takes it off the day; the day's entries that ran on this track alone go with it. A day of another conference is refused with INVALID_INPUT.",
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			calendarDayId: t.arg.id({ required: true }),
			runs: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanUpdateCalendarTrack({ ctx, id: args.id });
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
			await assertCanDeleteCalendarTrack({ ctx, id: args.id });
			await deleteCalendarTrack(args.id);
			return true;
		}
	})
}));
