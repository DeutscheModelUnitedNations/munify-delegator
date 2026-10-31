import { db } from '#api/db/db';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/**
 * The ids of the conference's delegation members and single participants who got a role at a
 * conference that ended before this one starts.
 */
export async function loadExperiencedIds(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { startConference: true }
	});
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	const earlier = { id: { ne: conferenceId }, endConference: { lt: conference.startConference } };
	const withUser = { participant: { columns: { userId: true } } } as const;

	const [members, singles, earlierMembers, earlierSingles] = await Promise.all([
		db.query.delegationMember.findMany({
			where: { participant: { conferenceId }, delegation: { applied: true } },
			columns: { id: true },
			with: withUser
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, applied: true },
			columns: { id: true },
			with: withUser
		}),
		db.query.delegationMember.findMany({
			where: {
				participant: { conference: earlier },
				delegation: { applied: true, assignedRoleId: { isNotNull: true } }
			},
			columns: { id: true },
			with: withUser
		}),
		db.query.singleParticipant.findMany({
			where: {
				participant: { conference: earlier },
				applied: true,
				assignedRoleId: { isNotNull: true }
			},
			columns: { id: true },
			with: withUser
		})
	]);

	const experiencedUserIds = new Set(
		[...earlierMembers, ...earlierSingles].map(({ participant }) => participant.userId)
	);
	return new Set(
		[...members, ...singles]
			.filter(({ participant }) => experiencedUserIds.has(participant.userId))
			.map(({ id }) => id)
	);
}
