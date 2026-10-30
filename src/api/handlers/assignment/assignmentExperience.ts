import { db } from '#api/db/db';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

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
	if (!conference) throw apiError('NOT_FOUND', m.conferenceNotFound());
	const earlier = { id: { ne: conferenceId }, endConference: { lt: conference.startConference } };

	const [members, singles, seatedMembers, seatedSingles] = await Promise.all([
		db.query.delegationMember.findMany({
			where: { participant: { conferenceId }, delegation: { applied: true } },
			columns: { id: true },
			with: { participant: { columns: { userId: true } } }
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, applied: true },
			columns: { id: true },
			with: { participant: { columns: { userId: true } } }
		}),
		db.query.delegationMember.findMany({
			where: {
				participant: { conference: earlier },
				delegation: {
					applied: true,
					assignedRoleId: { isNotNull: true }
				}
			},
			columns: { id: true },
			with: { participant: { columns: { userId: true } } }
		}),
		db.query.singleParticipant.findMany({
			where: {
				participant: { conference: earlier },
				applied: true,
				assignedRoleId: { isNotNull: true }
			},
			columns: { id: true },
			with: { participant: { columns: { userId: true } } }
		})
	]);

	const experienced = new Set(
		[...seatedMembers, ...seatedSingles].map(({ participant }) => participant.userId)
	);
	return new Set(
		[...members, ...singles]
			.filter(({ participant }) => experienced.has(participant.userId))
			.map(({ id }) => id)
	);
}
