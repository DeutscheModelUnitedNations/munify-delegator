import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/api/db/schema';
import { makeSeedConference } from '../../src/api/db/seed-data/conference';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { seatNations, upsertNationRole } from './conferenceRole';

/** A spec's own conference with the nations it uses, updated in place on reruns. */
export async function upsertConference(
	db: NodePgDatabase,
	options: {
		id: string;
		title: string;
		state: (typeof schema.conference.$inferInsert)['state'];
		/** alpha-3 to alpha-2 code */
		nations: Record<string, string>;
	}
) {
	const conference = {
		...makeSeedConference({ state: options.state }),
		id: options.id,
		title: options.title
	};
	await db
		.insert(schema.conference)
		.values(conference)
		.onConflictDoUpdate({ target: schema.conference.id, set: conference });

	for (const [alpha3Code, alpha2Code] of Object.entries(options.nations)) {
		await db.insert(schema.nation).values({ alpha3Code, alpha2Code }).onConflictDoNothing();
	}
	return conference;
}

/**
 * A committee with one seat per delegation, updated in place on reruns. `order` fixes its place
 * among the conference's committees (they are listed by creation).
 */
export async function upsertCommittee(
	db: NodePgDatabase,
	conferenceId: string,
	{ id, name, abbreviation }: { id: string; name: string; abbreviation: string },
	order: number
) {
	const committee = {
		id,
		conferenceId,
		name,
		abbreviation,
		numOfSeatsPerDelegation: 1,
		regionalBaseline: 'UN_MEMBERS' as const,
		regionalBaselineTargets: [],
		createdAt: new Date(2026, 0, 1 + order)
	};
	await db
		.insert(schema.committee)
		.values(committee)
		.onConflictDoUpdate({ target: schema.committee.id, set: committee });
	return committee;
}

/**
 * The committees of a spec's conference, in this order, each seating every one of the nations (as
 * the seat planning does).
 */
async function upsertSeatedCommittees(
	db: NodePgDatabase,
	{
		conferenceId,
		committees,
		nations
	}: {
		conferenceId: string;
		committees: readonly { id: string; name: string; abbreviation: string }[];
		nations: readonly string[];
	}
) {
	for (const [index, data] of committees.entries()) {
		const committee = await upsertCommittee(db, conferenceId, data, index);
		await seatNations(db, committee, nations);
	}
}

/**
 * The two committees the people fixtures share: a Generalversammlung and a Sicherheitsrat under
 * the fixture's own abbreviations, each seating every one of the nations.
 */
export function upsertGvAndSr(
	db: NodePgDatabase,
	{
		fixture,
		nations
	}: {
		fixture: { conferenceId: string; gvId: string; srId: string; gv: string; sr: string };
		nations: readonly string[];
	}
) {
	return upsertSeatedCommittees(db, {
		conferenceId: fixture.conferenceId,
		committees: [
			{ id: fixture.gvId, name: 'Generalversammlung', abbreviation: fixture.gv },
			{ id: fixture.srId, name: 'Sicherheitsrat', abbreviation: fixture.sr }
		],
		nations
	});
}

/** Delegations that applied and hold their nation, updated in place on reruns. */
export async function upsertSeatedDelegations(
	db: NodePgDatabase,
	{
		conferenceId,
		delegations
	}: {
		conferenceId: string;
		/** Each delegation's id and the alpha-3 code of its nation. */
		delegations: readonly (readonly [id: string, nation: string])[];
	}
) {
	for (const [id, nation] of delegations) {
		const delegation = {
			...makeSeedDelegation({ conferenceId, applied: true }),
			id,
			assignedRoleId: await upsertNationRole(db, conferenceId, nation)
		};
		await db
			.insert(schema.delegation)
			.values(delegation)
			.onConflictDoUpdate({ target: schema.delegation.id, set: delegation });
	}
}
