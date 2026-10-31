import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { callerUserId } from '#api/services/authHelper/utils';
import { decidePossibleDuplicate, scanConferenceForDuplicates } from './possibleDuplicates';
import {
	assertCanDecidePossibleDuplicate,
	assertCanScanPossibleDuplicates,
	registerPossibleDuplicateAbilities
} from './possibleDuplicatePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

registerPossibleDuplicateAbilities();

const statusEnum = enum_({ tsName: 'possibleDuplicateStatus' });

type Attendance = {
	conferenceId: string;
	title: string;
	startConference: Date;
	role: 'DELEGATION_MEMBER' | 'SINGLE_PARTICIPANT' | 'SUPERVISOR';
};

const AttendanceRef = schemaBuilder.objectRef<Attendance>('PossibleDuplicateAttendance').implement({
	description: 'A conference an account of a possible duplicate took part in, and as what.',
	fields: (t) => ({
		conferenceId: t.exposeID('conferenceId'),
		title: t.exposeString('title'),
		startConference: t.field({ type: 'DateTime', resolve: (a) => a.startConference }),
		role: t.exposeString('role')
	})
});

const CONFERENCE_COLUMNS = { columns: { id: true, title: true, startConference: true } } as const;

/**
 * Every conference the account took part in, newest first: what tells the care team whether the
 * other account is the one they remember. Conference titles and dates are public, so this does
 * not go through the registration rows' read rules, which would show far more.
 */
async function attendancesOf(id: string): Promise<Attendance[]> {
	const [memberships, singles, supervisions] = await Promise.all([
		db.query.delegationMember.findMany({
			where: { participant: { userId: id } },
			with: { delegation: { columns: {}, with: { conference: CONFERENCE_COLUMNS } } }
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { userId: id } },
			with: { conference: CONFERENCE_COLUMNS }
		}),
		db.query.conferenceSupervisor.findMany({
			where: { participant: { userId: id } },
			with: { conference: CONFERENCE_COLUMNS }
		})
	]);
	const attendance = ({
		conference,
		role
	}: {
		conference: { id: string; title: string; startConference: Date };
		role: Attendance['role'];
	}): Attendance => ({
		conferenceId: conference.id,
		title: conference.title,
		startConference: conference.startConference,
		role
	});
	return [
		...memberships.map((m) =>
			attendance({ conference: m.delegation.conference, role: 'DELEGATION_MEMBER' })
		),
		...singles.map((s) => attendance({ conference: s.conference, role: 'SINGLE_PARTICIPANT' })),
		...supervisions.map((s) => attendance({ conference: s.conference, role: 'SUPERVISOR' }))
	].sort((a, b) => b.startConference.getTime() - a.startConference.getTime());
}

const PossibleDuplicateRef = object({
	table: 'possibleDuplicate',
	adjust: (t) => ({
		userAttendances: t.field({
			type: [AttendanceRef],
			resolve: (pair) => attendancesOf(pair.userId)
		}),
		candidateAttendances: t.field({
			type: [AttendanceRef],
			resolve: (pair) => attendancesOf(pair.candidateId)
		})
	})
});
query({ table: 'possibleDuplicate' });

schemaBuilder.mutationFields((t) => ({
	scanPossibleDuplicates: t.field({
		description:
			'Looks for duplicates of everyone taking part in the conference; answers the pairs found.',
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanScanPossibleDuplicates({ ctx, conferenceId: args.conferenceId });
			return scanConferenceForDuplicates(args.conferenceId);
		}
	}),

	decidePossibleDuplicate: t.drizzleField({
		description:
			"Settles a pair: `CONFIRMED` (one person), `DISMISSED` (two people), or back to `OPEN`. A dismissed pair no longer lets the care team read the other account's notes.",
		type: PossibleDuplicateRef,
		args: {
			id: t.arg.id({ required: true }),
			status: t.arg({ type: statusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanDecidePossibleDuplicate({ ctx, id: args.id });
			await decidePossibleDuplicate({
				id: args.id,
				status: args.status,
				decidedById: callerUserId(ctx) ?? null
			});

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
