/** The states of a formality (payment, the postal documents), as the database's enum has them. */
export const ADMINISTRATIVE_STATUSES = [
	'DONE',
	'PENDING',
	'PROBLEM',
	'NEEDS_HUMAN_REVIEW'
] as const;

export type AdministrativeStatus = (typeof ADMINISTRATIVE_STATUSES)[number];

/** A status as participants and supervisors see it. */
export type ParticipantFacingStatus = Exclude<AdministrativeStatus, 'NEEDS_HUMAN_REVIEW'>;

/**
 * What participants and supervisors see of a status. `NEEDS_HUMAN_REVIEW` is the team's flag that
 * automation could not settle something (the bank payment sync): to them it is still open.
 */
export function participantFacingStatus(status: AdministrativeStatus): ParticipantFacingStatus {
	return status === 'NEEDS_HUMAN_REVIEW' ? 'PENDING' : status;
}
