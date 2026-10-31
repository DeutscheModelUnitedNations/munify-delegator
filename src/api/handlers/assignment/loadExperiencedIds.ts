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
	const seated = { applied: true, assignedRoleId: { isNotNull: true } } as const;
	// an EXISTS per applicant, so the history of earlier conferences is never read into memory
	const participant = {
		conferenceId,
		user: {
			conferenceParticipants: {
				conference: { id: { ne: conferenceId }, endConference: { lt: conference.startConference } },
				OR: [{ delegationMember: { delegation: seated } }, { singleParticipant: seated }]
			}
		}
	};

	const [members, singles] = await Promise.all([
		db.query.delegationMember.findMany({
			where: { participant, delegation: { applied: true } },
			columns: { id: true }
		}),
		db.query.singleParticipant.findMany({
			where: { participant, applied: true },
			columns: { id: true }
		})
	]);
	return new Set([...members, ...singles].map(({ id }) => id));
}
