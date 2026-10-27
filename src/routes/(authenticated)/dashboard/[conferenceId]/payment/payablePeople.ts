import { client } from '#lib/api/rumbleClient/client.js';
import { getCurrentUser } from '#lib/state/currentUser.svelte.js';

const payableUser = { id: true, givenName: true, familyName: true } as const;

/** Somebody who has paid is shown, but can no longer be covered by a reference. */
const paymentStatus = { participant: { paymentStatus: true } } as const;

const studentSelection = {
	id: true,
	supervisors: { id: true },
	user: payableUser,
	...paymentStatus
} as const;

/**
 * Whether the caller has paid, and everyone they may pay for in a conference, and how: their
 * delegation's members; as a supervisor, their students; and the supervisors sharing a student with
 * them, so one transfer can name the ones it covers. Not every supervisor of the conference: the caller may list those, but
 * may only read the `user` of the ones they share a participant with, and a non-nullable `user`
 * that comes back null fails the whole query.
 *
 * All at once, so none of them waits on another.
 */
export async function fetchPayablePeople(conferenceId: string) {
	const user = await getCurrentUser();
	const sharesAParticipant = { supervisors: { user: { id: { eq: user.sub } } } };
	const [myStatuses, myMemberships, mySupervisorRegistrations, supervisorsSharingAStudent] =
		await Promise.all([
			client.liveQuery.conferenceParticipants({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
				paymentStatus: true
			}),
			client.liveQuery.delegationMembers({
				__args: {
					where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: user.sub } } }
				},
				delegation: { members: { id: true, user: payableUser, ...paymentStatus } }
			}),
			client.liveQuery.conferenceSupervisors({
				__args: {
					where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: user.sub } } }
				},
				id: true,
				plansOwnAttendenceAtConference: true,
				user: payableUser,
				supervisedDelegationMembers: studentSelection,
				supervisedSingleParticipants: studentSelection
			}),
			client.liveQuery.conferenceSupervisors({
				__args: {
					where: {
						conference: { id: { eq: conferenceId } },
						OR: [
							{ supervisedDelegationMembers: sharesAParticipant },
							{ supervisedSingleParticipants: sharesAParticipant }
						]
					}
				},
				id: true,
				user: payableUser,
				supervisedDelegationMembers: { id: true },
				supervisedSingleParticipants: { id: true }
			})
		]);
	return { user, myStatuses, myMemberships, mySupervisorRegistrations, supervisorsSharingAStudent };
}
