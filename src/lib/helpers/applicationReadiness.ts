import type { ConferencestateEnum } from '$lib/api/rumbleClient/client';

/**
 * What an application needs before it may be sent, shared by the API (which refuses it,
 * `$api/services/registration/applicationReadiness`) and the registration stages (which show it as
 * todos), so the two cannot disagree.
 */

/** How many roles an applicant has to apply for before sending the application. */
export const MIN_ROLE_APPLICATIONS = { delegation: 3, singleParticipant: 1 } as const;

/** A delegation needs at least this many members to apply. */
export const MIN_DELEGATION_MEMBERS = 2;

type ApplicationTexts = {
	school?: string | null;
	motivation?: string | null;
	experience?: string | null;
};

/** Whether school, motivation and experience are all filled in. */
export function applicationTextsComplete(texts: ApplicationTexts) {
	return !!texts.school && !!texts.motivation && !!texts.experience;
}

/**
 * When the API stops taking applications: the advertised deadline (`startAssignment`) plus the
 * grace period. Participants are only ever shown `startAssignment`; the grace period is a buffer
 * for those who were just about done.
 */
export function technicalRegistrationDeadline(conference: {
	startAssignment: Date;
	registrationDeadlineGracePeriodMinutes: number;
}) {
	return new Date(
		new Date(conference.startAssignment).getTime() +
			conference.registrationDeadlineGracePeriodMinutes * 60_000
	);
}

/** Whether the API accepts an application to the conference right now. */
export function acceptsApplications(
	conference: {
		state: ConferencestateEnum;
		startAssignment: Date;
		registrationDeadlineGracePeriodMinutes: number;
	},
	now = new Date()
) {
	return (
		conference.state === 'PARTICIPANT_REGISTRATION' &&
		now.getTime() <= technicalRegistrationDeadline(conference).getTime()
	);
}
