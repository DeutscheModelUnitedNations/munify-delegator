import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';

/**
 * What an application needs before it may be sent, shared by the API (which refuses it,
 * `#api/services/registration/applicationReadiness`) and the registration stages (which show it as
 * todos), so the two cannot disagree.
 */

/** How many roles an applicant has to apply for before sending the application. */
export const MIN_ROLE_APPLICATIONS = { delegation: 3, singleParticipant: 1 } as const;

/** A delegation needs at least this many members to apply. */
export const MIN_DELEGATION_MEMBERS = 2;

type ApplicationTexts = {
	motivation?: string | null;
	experience?: string | null;
};

/** Whether motivation and experience are filled in. The school is optional: not everybody has one. */
export function applicationTextsComplete(texts: ApplicationTexts) {
	return !!texts.motivation && !!texts.experience;
}

/**
 * When the API stops taking applications: the advertised deadline (`applicationDeadline`) plus the
 * grace period. Participants are only ever shown `applicationDeadline`; the grace period is a buffer
 * for those who were just about done.
 */
export function technicalRegistrationDeadline(conference: {
	applicationDeadline: Date;
	registrationDeadlineGracePeriodMinutes: number;
}) {
	return new Date(
		new Date(conference.applicationDeadline).getTime() +
			conference.registrationDeadlineGracePeriodMinutes * 60_000
	);
}

/** Whether the API accepts an application to the conference right now. */
export function acceptsApplications({
	conference,
	now = Date.now()
}: {
	conference: {
		state: ConferencestateEnum;
		applicationDeadline: Date;
		registrationDeadlineGracePeriodMinutes: number;
	};
	/** A timestamp in milliseconds. */
	now?: number;
}) {
	return (
		conference.state === 'PARTICIPANT_REGISTRATION' &&
		now <= technicalRegistrationDeadline(conference).getTime()
	);
}

/**
 * Whether the selection is running: the conference still takes registrations, but its technical
 * deadline has passed, so nobody can apply any more and the team is sighting the applications.
 */
export function selectionInProgress({
	conference,
	now = Date.now()
}: {
	conference: Parameters<typeof acceptsApplications>[0]['conference'];
	/** A timestamp in milliseconds. */
	now?: number;
}) {
	return (
		conference.state === 'PARTICIPANT_REGISTRATION' && !acceptsApplications({ conference, now })
	);
}
