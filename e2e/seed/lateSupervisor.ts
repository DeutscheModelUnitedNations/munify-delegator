/**
 * Fixtures for the late supervisor sign-up spec (e2e/authorization/late-supervisor.spec.ts).
 *
 * Two conferences of their own, because the spec signs supervisors up: one past registration
 * (PREPARATION), where a supervisor may still sign up, and one that is over (POST), where nobody
 * may. Every run removes the supervisors earlier runs signed up.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { upsertConference } from './conference';

export const E2E_LATE_SUPERVISOR_CONFERENCE_ID = 'e2e00000conference0000008';
export const E2E_OVER_CONFERENCE_ID = 'e2e00000conference0000009';

export async function seedLateSupervisor(db: NodePgDatabase) {
	await upsertConference(db, {
		id: E2E_LATE_SUPERVISOR_CONFERENCE_ID,
		title: 'E2E Late Supervisor Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await upsertConference(db, {
		id: E2E_OVER_CONFERENCE_ID,
		title: 'E2E Conference That Is Over',
		state: 'POST',
		nations: {}
	});

	const conferenceIds = [E2E_LATE_SUPERVISOR_CONFERENCE_ID, E2E_OVER_CONFERENCE_ID];
	const participants = db
		.select({ id: schema.conferenceParticipant.id })
		.from(schema.conferenceParticipant)
		.where(inArray(schema.conferenceParticipant.conferenceId, conferenceIds));
	await db
		.delete(schema.conferenceSupervisor)
		.where(inArray(schema.conferenceSupervisor.conferenceParticipantId, participants));
	await db
		.delete(schema.conferenceParticipant)
		.where(inArray(schema.conferenceParticipant.conferenceId, conferenceIds));
}
