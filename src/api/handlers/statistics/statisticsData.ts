import { db, schema } from '$api/db/db';
import { eq } from 'drizzle-orm';

/** Runs `load` on the first call and hands every later call the same promise. */
function once<T>(load: () => Promise<T>) {
	let promise: Promise<T> | undefined;
	return () => (promise ??= load());
}

/**
 * One conference's rows of each statistics view, each loaded on first use and then kept, so the
 * blocks of one request that share a view read it once.
 */
export function statisticsRowsOf(conferenceId: string) {
	const rowsOf = <
		V extends
			| typeof schema.statisticsPeople
			| typeof schema.statisticsDelegations
			| typeof schema.statisticsRegistrationDays
			| typeof schema.statisticsRoleApplications
			| typeof schema.statisticsAges
			| typeof schema.statisticsAddresses
			| typeof schema.statisticsParticipantStatus
			| typeof schema.statisticsCommitteeFill
			| typeof schema.statisticsWaitingList
			| typeof schema.statisticsPapers
	>(
		view: V
	) => once(async () => db.select().from(view).where(eq(view.conferenceId, conferenceId)));

	return {
		people: rowsOf(schema.statisticsPeople),
		delegations: rowsOf(schema.statisticsDelegations),
		registrationDays: rowsOf(schema.statisticsRegistrationDays),
		roleApplications: rowsOf(schema.statisticsRoleApplications),
		ages: rowsOf(schema.statisticsAges),
		addresses: rowsOf(schema.statisticsAddresses),
		participantStatus: rowsOf(schema.statisticsParticipantStatus),
		committeeFill: rowsOf(schema.statisticsCommitteeFill),
		waitingList: rowsOf(schema.statisticsWaitingList),
		papers: rowsOf(schema.statisticsPapers)
	};
}

export type StatisticsRows = ReturnType<typeof statisticsRowsOf>;

/** When the views were last refreshed; undefined before the first refresh after a reset. */
export async function statisticsRefreshedAt() {
	const [row] = await db.select().from(schema.statisticsRefreshedAt);
	return row?.refreshedAt;
}
