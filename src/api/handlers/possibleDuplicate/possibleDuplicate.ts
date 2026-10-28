import { db } from '#api/db/db.js';
import { enum_, object, query, schemaBuilder } from '#api/rumble.js';
import { userId, readableById } from '#api/services/authHelper.js';
import { decidePossibleDuplicate, scanConferenceForDuplicates } from './possibleDuplicates';
import {
	assertCanDecidePossibleDuplicate,
	assertCanScanPossibleDuplicates,
	registerPossibleDuplicateAbilities
} from './possibleDuplicatePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { possibleDuplicatePubsub, userPubsub } from '#api/pubsub.js';

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
	const attendance = (
		conference: { id: string; title: string; startConference: Date },
		role: Attendance['role']
	): Attendance => ({
		conferenceId: conference.id,
		title: conference.title,
		startConference: conference.startConference,
		role
	});
	return [
		...memberships.map((m) => attendance(m.delegation.conference, 'DELEGATION_MEMBER')),
		...singles.map((s) => attendance(s.conference, 'SINGLE_PARTICIPANT')),
		...supervisions.map((s) => attendance(s.conference, 'SUPERVISOR'))
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
	/** Looks for duplicates of everyone taking part in the conference; answers the pairs found. */
	scanPossibleDuplicates: t.field({
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanScanPossibleDuplicates(ctx, args.conferenceId);
			return scanConferenceForDuplicates(args.conferenceId);
		}
	}),

	/**
	 * Settles a pair: `CONFIRMED` (one person), `DISMISSED` (two people), or back to `OPEN`. A
	 * dismissed pair no longer lets the care team read the other account's notes.
	 */
	decidePossibleDuplicate: t.drizzleField({
		type: PossibleDuplicateRef,
		args: {
			id: t.arg.id({ required: true }),
			status: t.arg({ type: statusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const pair = await assertCanDecidePossibleDuplicate(ctx, args.id);
			await decidePossibleDuplicate(args.id, args.status, userId(ctx) ?? null);

			possibleDuplicatePubsub.updated(args.id);
			// what of each account the care team may read follows the decision
			userPubsub.updated(pair.userId);
			userPubsub.updated(pair.candidateId);

			return db.query.possibleDuplicate
				.findFirst(query(await readableById(ctx.abilities.possibleDuplicate, args.id)))
				.then(assertFindFirstExists);
		}
	})
}));
