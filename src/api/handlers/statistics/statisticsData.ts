import { db, schema } from '#api/db/db';
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
			| typeof schema.statisticsSchools
			| typeof schema.statisticsRegistrationDays
			| typeof schema.statisticsRoleApplications
			| typeof schema.statisticsRolePopularity
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
		schools: rowsOf(schema.statisticsSchools),
		registrationDays: rowsOf(schema.statisticsRegistrationDays),
		roleApplications: rowsOf(schema.statisticsRoleApplications),
		rolePopularity: rowsOf(schema.statisticsRolePopularity),
		ages: rowsOf(schema.statisticsAges),
		addresses: rowsOf(schema.statisticsAddresses),
		participantStatus: rowsOf(schema.statisticsParticipantStatus),
		committeeFill: rowsOf(schema.statisticsCommitteeFill),
		waitingList: rowsOf(schema.statisticsWaitingList),
		papers: rowsOf(schema.statisticsPapers),
		popularityRoles: once(() => popularityRolesOf(conferenceId))
	};
}

/**
 * The nations and non-state actors of a conference and its committees' seats, read live: the
 * role popularity lists every role, also those nobody wished for, with the seats it has now.
 */
async function popularityRolesOf(conferenceId: string) {
	const [roles, committees] = await Promise.all([
		db.query.conferenceRole.findMany({
			where: { conferenceId, kind: { in: ['NATION', 'NON_STATE_ACTOR'] } },
			columns: {
				id: true,
				kind: true,
				name: true,
				abbreviation: true,
				icon: true,
				nationAlpha3Code: true,
				seatAmount: true
			},
			with: { nation: { columns: { alpha2Code: true } } }
		}),
		db.query.committee.findMany({
			where: { conferenceId },
			columns: { numOfSeatsPerDelegation: true },
			with: { roles: { columns: { id: true } } }
		})
	]);
	return { roles, committees };
}

export type StatisticsRows = ReturnType<typeof statisticsRowsOf>;

/** When the views were last refreshed; undefined before the first refresh after a reset. */
export async function statisticsRefreshedAt() {
	const [row] = await db.select().from(schema.statisticsRefreshedAt);
	return row?.refreshedAt;
}
