import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';

/**
 * The conference's role for a nation, created if it has none yet. Looked up rather than assumed,
 * because a spec seating the nation through the app may have created it under another id.
 */
export async function upsertNationRole(
	db: NodePgDatabase,
	conferenceId: string,
	alpha3Code: string
) {
	await db
		.insert(schema.conferenceRole)
		.values({
			id: `e2e-nation-${conferenceId}-${alpha3Code}`,
			conferenceId,
			kind: 'NATION',
			nationAlpha3Code: alpha3Code
		})
		.onConflictDoNothing();
	const [role] = await db
		.select({ id: schema.conferenceRole.id })
		.from(schema.conferenceRole)
		.where(
			and(
				eq(schema.conferenceRole.conferenceId, conferenceId),
				eq(schema.conferenceRole.nationAlpha3Code, alpha3Code)
			)
		);
	return role.id;
}

/** Seats the nations in the committee, as the seat planning does. */
export async function seatNations(
	db: NodePgDatabase,
	committee: { id: string; conferenceId: string },
	alpha3Codes: readonly string[]
) {
	for (const alpha3Code of alpha3Codes) {
		const roleId = await upsertNationRole(db, committee.conferenceId, alpha3Code);
		await db
			.insert(schema.committeeToRole)
			.values({ a: committee.id, b: roleId })
			.onConflictDoNothing();
	}
}
