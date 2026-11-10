/**
 * Whether a person owes the conference a fee and paperwork of their own (payment, terms and
 * conditions, guardian consent, media consent, the postal documents). Every delegate and single
 * participant does; a supervisor only while they attend in person
 * (`plansOwnAttendenceAtConference`): one who follows their students from home pays nothing and
 * signs nothing, though they may still pay for their students. The supervisor's dashboard, the
 * quick links, the postal registration page and the team's overviews all ask this, so they agree.
 */
export function owesOwnFormalities(
	supervisor: { plansOwnAttendenceAtConference: boolean } | null | undefined
) {
	return !supervisor || supervisor.plansOwnAttendenceAtConference;
}
