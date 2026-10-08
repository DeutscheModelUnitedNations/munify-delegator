import { db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isManagedUser,
	participatesIn,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { scanConferenceForDuplicates } from '$api/services/possibleDuplicates';
import { assertFindFirstExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Whoever looks after one of the two accounts sees the pair and decides on it. Who may read the
// *other* account, and how much of it, is a rule on the user table (`user.ts`).
abilityBuilder.possibleDuplicate.allow(['read', 'update']).when(systemAdmin);
abilityBuilder.possibleDuplicate.allow(['read', 'update']).when((ctx) => {
	const managed = isManagedUser(ctx);
	return managed ? { where: { OR: [{ user: managed }, { candidate: managed }] } } : undefined;
});

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
			where: { userId: id },
			with: { delegation: { columns: {}, with: { conference: CONFERENCE_COLUMNS } } }
		}),
		db.query.singleParticipant.findMany({
			where: { userId: id },
			with: { conference: CONFERENCE_COLUMNS }
		}),
		db.query.conferenceSupervisor.findMany({
			where: { userId: id },
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
const pubsub = rumblePubsub({ table: 'possibleDuplicate' });
const userPubsub = rumblePubsub({ table: 'user' });

schemaBuilder.queryFields((t) => ({
	/**
	 * Open and confirmed pairs with an account taking part in the conference, likeliest first.
	 * Dismissed ones are left out: their other account is no longer readable (see `user.ts`).
	 */
	conferencePossibleDuplicates: t.drizzleField({
		type: [PossibleDuplicateRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const participant = participatesIn({ id: args.conferenceId });
			return db.query.possibleDuplicate.findMany(
				query({
					...(await ctx.abilities.possibleDuplicate.filter('read')).merge({
						where: {
							status: { in: ['OPEN', 'CONFIRMED'] },
							OR: [{ user: participant }, { candidate: participant }]
						}
					}).query.many,
					orderBy: { score: 'desc' }
				})
			);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/** Looks for duplicates of everyone taking part in the conference; answers the pairs found. */
	scanPossibleDuplicates: t.field({
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			return scanConferenceForDuplicates(args.conferenceId);
		}
	}),

	/**
	 * Settles a pair: `CONFIRMED` (one person), `DISMISSED` (two people), or back to `OPEN`. A
	 * dismissed pair no longer lets the care team read the other account.
	 */
	decidePossibleDuplicate: t.drizzleField({
		type: PossibleDuplicateRef,
		args: {
			id: t.arg.id({ required: true }),
			status: t.arg({ type: statusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const decided = args.status !== 'OPEN';
			const updated = await db
				.update(schema.possibleDuplicate)
				.set({
					status: args.status,
					decidedById: decided ? (userId(ctx) ?? null) : null,
					decidedAt: decided ? new Date() : null
				})
				.where(
					(await ctx.abilities.possibleDuplicate.filter('update')).merge({
						where: { id: args.id }
					}).sql.where
				)
				.returning({
					userId: schema.possibleDuplicate.userId,
					candidateId: schema.possibleDuplicate.candidateId
				});
			const [pair] = updated;
			if (!pair) throw new GraphQLError('Possible duplicate not found or access denied');

			pubsub.updated(args.id);
			// what of each account the care team may read follows the decision
			userPubsub.updated(pair.userId);
			userPubsub.updated(pair.candidateId);

			return db.query.possibleDuplicate
				.findFirst(
					query(
						(await ctx.abilities.possibleDuplicate.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
