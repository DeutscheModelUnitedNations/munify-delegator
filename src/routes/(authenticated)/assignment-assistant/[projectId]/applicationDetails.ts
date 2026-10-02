import { client } from '$lib/api/rumbleClient/client';

/**
 * The project file only carries ids. These are the lookups the cards and the sighting view make
 * to show who and what is behind them, each fetching only the columns it displays.
 */

/** The names of the given supervisors. */
export function fetchSupervisorNames(supervisorIds: string[]) {
	// An empty `in` list would compile to invalid SQL.
	if (supervisorIds.length === 0) return Promise.resolve([]);
	return client.query.conferenceSupervisors({
		__args: { where: { id: { in: supervisorIds } } },
		id: true,
		user: { id: true, givenName: true, familyName: true }
	});
}

/**
 * An application's school, motivation and experience. The id names
 * either a delegation or a single participant, so both are looked up and whichever exists wins.
 */
export async function fetchApplicationTexts(applicationId: string) {
	const where = { where: { id: { eq: applicationId } } };
	const selection = { id: true, school: true, experience: true, motivation: true } as const;
	const [delegations, singleParticipants] = await Promise.all([
		client.query.delegations({ __args: where, ...selection }),
		client.query.singleParticipants({ __args: where, ...selection })
	]);
	return delegations.at(0) ?? singleParticipants.at(0);
}

/** An application's school; the id names either a delegation or a single participant. */
export async function fetchApplicationSchool(applicationId: string) {
	const where = { where: { id: { eq: applicationId } } };
	const [delegations, singleParticipants] = await Promise.all([
		client.query.delegations({ __args: where, id: true, school: true }),
		client.query.singleParticipants({ __args: where, id: true, school: true })
	]);
	return delegations.at(0) ?? singleParticipants.at(0);
}
