import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	attendancesOf,
	decidePossibleDuplicate,
	scanConferenceForDuplicates,
	type Attendance
} from './possibleDuplicateService';
import {
	assertCanDecidePossibleDuplicate,
	assertCanScanPossibleDuplicates,
	registerPossibleDuplicateAbilities
} from './possibleDuplicatePermissions';

registerPossibleDuplicateAbilities();

const statusEnum = enum_({ tsName: 'possibleDuplicateStatus' });

const AttendanceRef = schemaBuilder.objectRef<Attendance>('PossibleDuplicateAttendance').implement({
	description: 'A conference an account of a possible duplicate took part in, and as what.',
	fields: (t) => ({
		conferenceId: t.exposeID('conferenceId', { description: "The conference's id." }),
		title: t.exposeString('title', { description: "The conference's title." }),
		startConference: t.field({
			type: 'DateTime',
			description: 'When the conference started.',
			resolve: (a) => a.startConference
		}),
		role: t.exposeString('role', {
			description: 'How the account took part: DELEGATION_MEMBER, SINGLE_PARTICIPANT or SUPERVISOR.'
		})
	})
});

const PossibleDuplicateRef = object({
	table: 'possibleDuplicate',
	adjust: (t) => ({
		userAttendances: t.field({
			description:
				"The conferences the pair's first account took part in, latest first, of every organizer.",
			type: [AttendanceRef],
			resolve: (pair) => attendancesOf(pair.userId)
		}),
		candidateAttendances: t.field({
			description:
				"The conferences the pair's second account took part in, latest first, of every organizer.",
			type: [AttendanceRef],
			resolve: (pair) => attendancesOf(pair.candidateId)
		})
	})
});
query({ table: 'possibleDuplicate' });

schemaBuilder.mutationFields((t) => ({
	scanPossibleDuplicates: t.field({
		description:
			'Compares everyone taking part in the conference with the accounts of earlier conferences and those with a care note, and stores the pairs found: new ones open, known ones with a fresh score but their decision kept. Answers how many pairs the scan found.',
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanScanPossibleDuplicates({ ctx, conferenceId: args.conferenceId });
			return scanConferenceForDuplicates(args.conferenceId);
		}
	}),

	decidePossibleDuplicate: t.drizzleField({
		description:
			"Settles a pair: `CONFIRMED` (one person), `DISMISSED` (two people), or back to `OPEN`, which forgets who decided. A dismissed pair no longer lets the care team read the other account's notes. NOT_FOUND for a pair the caller may not decide.",
		type: PossibleDuplicateRef,
		args: {
			id: t.arg.id({ required: true }),
			status: t.arg({ type: statusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const { callerId } = await assertCanDecidePossibleDuplicate({ ctx, id: args.id });
			await decidePossibleDuplicate({ id: args.id, status: args.status, decidedById: callerId });

			return db.query.possibleDuplicate
				.findFirst(
					query(
						(await ctx.abilities.possibleDuplicate.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
