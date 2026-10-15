import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';

/**
 * The person's `conferenceParticipant` row, created if they have none yet, as registering through
 * the app does. Returns its id.
 */
export async function upsertParticipant(db: NodePgDatabase, conferenceId: string, userId: string) {
	await db
		.insert(schema.conferenceParticipant)
		.values({ conferenceId, userId })
		.onConflictDoNothing();
	const [participant] = await db
		.select({ id: schema.conferenceParticipant.id })
		.from(schema.conferenceParticipant)
		.where(
			and(
				eq(schema.conferenceParticipant.conferenceId, conferenceId),
				eq(schema.conferenceParticipant.userId, userId)
			)
		);
	return participant.id;
}
