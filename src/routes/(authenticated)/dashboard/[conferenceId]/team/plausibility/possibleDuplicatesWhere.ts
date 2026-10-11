/**
 * The pairs of a conference: those with an account taking part in it as delegate, single
 * participant or supervisor. Asked for through the generated `possibleDuplicates` query rather
 * than a query of its own, because only a generated one is live: a scan or a decision announces
 * itself on the table, and an open page refreshes.
 */
export function duplicatesOfConference(conferenceId: string) {
	const takesPart = {
		OR: [
			{ delegationMemberships: { conferenceId: { eq: conferenceId } } },
			{ singleParticipant: { conferenceId: { eq: conferenceId } } },
			{ conferenceSupervisor: { conferenceId: { eq: conferenceId } } }
		]
	};
	return { OR: [{ user: takesPart }, { candidate: takesPart }] };
}
