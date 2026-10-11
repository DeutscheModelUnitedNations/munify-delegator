import { db } from '$api/db/db';
import { GraphQLError } from 'graphql';

/**
 * The delegation members and single participants of a conference whose person was accepted to an
 * earlier one: seated in an applied delegation (a nation or non-state actor) or given a role as an
 * applied single participant, at a conference that ended before this one starts.
 */
export async function loadExperiencedIds(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { startConference: true }
	});
	if (!conference) throw new GraphQLError('Conference not found');
	const earlier = { id: { ne: conferenceId }, endConference: { lt: conference.startConference } };

	const [members, singles, seatedMembers, seatedSingles] = await Promise.all([
		db.query.delegationMember.findMany({
			where: { conferenceId, delegation: { applied: true } },
			columns: { id: true, userId: true }
		}),
		db.query.singleParticipant.findMany({
			where: { conferenceId, applied: true },
			columns: { id: true, userId: true }
		}),
		db.query.delegationMember.findMany({
			where: {
				conference: earlier,
				delegation: {
					applied: true,
					OR: [
						{ assignedNationAlpha3Code: { isNotNull: true } },
						{ assignedNonStateActorId: { isNotNull: true } }
					]
				}
			},
			columns: { userId: true }
		}),
		db.query.singleParticipant.findMany({
			where: { conference: earlier, applied: true, assignedRoleId: { isNotNull: true } },
			columns: { userId: true }
		})
	]);

	const experienced = new Set([...seatedMembers, ...seatedSingles].map(({ userId }) => userId));
	return new Set(
		[...members, ...singles].filter(({ userId }) => experienced.has(userId)).map(({ id }) => id)
	);
}
