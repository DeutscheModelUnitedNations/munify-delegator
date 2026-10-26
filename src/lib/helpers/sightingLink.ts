import { resolve } from '$app/paths';

/** The sighting, opened at one application (a delegation or a single participant): where it is rated. */
export const sightingHref = (conferenceId: string, applicationId: string) =>
	resolve(
		`/(authenticated)/dashboard/[conferenceId]/team/assignment/sighting?application=${applicationId}`,
		{ conferenceId }
	);
