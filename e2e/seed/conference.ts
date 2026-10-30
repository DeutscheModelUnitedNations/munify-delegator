import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/api/db/schema';
import { makeSeedConference } from '../../src/api/db/seed-data/conference';

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
