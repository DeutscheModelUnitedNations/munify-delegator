import { client } from '$lib/api/rumbleClient/client';

/**
 * The applications of a conference and the draft on top of them, live, without the reviews: every
 * draft mutation publishes to these tables, a rating or note does not.
 */
export async function fetchAssignmentRows(
	conferenceId: string,
	/**
	 * Only the delegations and single participants the draft touches. The draft holds nothing but
	 * changes, so counting what applying it would change needs no more than those.
	 */
	options: { draftOnly?: boolean } = {}
) {
	const inConference = { conferenceId: { eq: conferenceId } };
	const [units, draftSingleRoles] = await Promise.all([
		client.liveQuery.assignmentUnits({
			__args: { where: inConference },
			id: true,
			sourceDelegationId: true,
			sourceSingleParticipantId: true,
			nationAlpha3Code: true,
			nonStateActorId: true,
			members: { delegationMemberId: true }
		}),
		client.liveQuery.assignmentSingleRoles({
			__args: { where: inConference },
			singleParticipantId: true,
			roleId: true
		})
	]);
	const touched = options.draftOnly
		? {
				delegations: {
					id: {
						in: [...new Set(units.flatMap((unit) => unit.sourceDelegationId ?? []))]
					}
				},
				singleParticipants: {
					id: {
						in: [
							...new Set([
								...units.flatMap((unit) => unit.sourceSingleParticipantId ?? []),
								...draftSingleRoles.map((role) => role.singleParticipantId)
							])
						]
					}
				}
			}
		: { delegations: {}, singleParticipants: {} };
	const [delegations, singleParticipants] = await Promise.all([
		client.liveQuery.delegations({
			__args: { where: { ...inConference, applied: { eq: true }, ...touched.delegations } },
			id: true,
			school: true,
			assignedNationAlpha3Code: true,
			assignedNonStateActorId: true,
			members: {
				id: true,
				isHeadDelegate: true,
				user: { givenName: true, familyName: true }
			},
			appliedForRoles: {
				rank: true,
				nation: { alpha3Code: true },
				nonStateActor: { id: true, abbreviation: true }
			}
		}),
		client.liveQuery.singleParticipants({
			__args: { where: { ...inConference, applied: { eq: true }, ...touched.singleParticipants } },
			id: true,
			school: true,
			assignedRoleId: true,
			user: { givenName: true, familyName: true },
			appliedForRoles: { id: true, name: true }
		})
	]);
	return { delegations, singleParticipants, units, draftSingleRoles };
}

/** The team's ratings, flags, exclusions and notes, live. */
export function fetchAssignmentReviews(conferenceId: string) {
	return client.liveQuery.assignmentReviews({
		__args: { where: { conferenceId: { eq: conferenceId } } },
		delegationId: true,
		singleParticipantId: true,
		evaluation: true,
		flagged: true,
		disqualified: true,
		note: true
	});
}

/** Everything the board needs: the rows and the reviews. */
export async function fetchAssignmentBoard(conferenceId: string) {
	const [rows, reviews] = await Promise.all([
		fetchAssignmentRows(conferenceId),
		fetchAssignmentReviews(conferenceId)
	]);
	return { ...rows, reviews };
}

export type AssignmentBoard = Awaited<ReturnType<typeof fetchAssignmentBoard>>;
export type BoardDelegation = AssignmentBoard['delegations'][number];
export type BoardSingleParticipant = AssignmentBoard['singleParticipants'][number];
export type BoardReview = AssignmentBoard['reviews'][number];

/** The nations, non-state actors and custom roles of a conference, with their seats. */
export async function fetchAssignmentRoles(conferenceId: string) {
	const inConference = { where: { conferenceId: { eq: conferenceId } } };
	const [committees, nonStateActors, customRoles] = await Promise.all([
		client.liveQuery.committees({
			__args: inConference,
			abbreviation: true,
			numOfSeatsPerDelegation: true,
			nations: { alpha2Code: true, alpha3Code: true }
		}),
		client.liveQuery.nonStateActors({
			__args: inConference,
			id: true,
			name: true,
			abbreviation: true,
			fontAwesomeIcon: true,
			seatAmount: true
		}),
		client.liveQuery.customConferenceRoles({
			__args: inConference,
			id: true,
			name: true,
			fontAwesomeIcon: true,
			seatAmount: true
		})
	]);
	return { committees, nonStateActors, customRoles };
}
