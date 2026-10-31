/**
 * Fixtures for the scanner session specs (e2e/team/attendance-sessions.spec.ts).
 *
 * A separate conference, because the specs start, end and reopen sessions. Every run resets it to
 * one ended session, "Eröffnung", in which Ada (a single participant) was scanned.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_ATTENDANCE_CONFERENCE_ID = 'e2e00000conference0000006';
export const E2E_ATTENDANCE_CARE_ID = 'e2e-attendance-care';
export const E2E_ATTENDANCE_ADA_ID = 'e2e-attendance-ada';
export const E2E_ATTENDANCE_ENDED_SESSION = {
	id: 'e2e00000attendancesession1',
	occasion: 'Eröffnung'
} as const;
const ADA_SINGLE_PARTICIPANT_ID = 'e2e00000attendancesingle01';

export async function seedAttendance(db: NodePgDatabase) {
	const { id: conferenceId } = await upsertConference(db, {
		id: E2E_ATTENDANCE_CONFERENCE_ID,
		title: 'E2E Attendance Conference',
		state: 'ACTIVE',
		nations: {}
	});

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_ATTENDANCE_CARE_ID,
			givenName: 'E2E',
			familyName: 'AttendanceCare'
		},
		{ ...makeSeedUser(), id: E2E_ATTENDANCE_ADA_ID, givenName: 'Ada', familyName: 'Lovelace' }
	]);
	await upsertTeamMember(db, conferenceId, E2E_ATTENDANCE_CARE_ID, 'PARTICIPANT_CARE');

	const single = {
		...makeSeedSingleParticipant({
			conferenceParticipantId: await upsertParticipant(db, conferenceId, E2E_ATTENDANCE_ADA_ID),
			applied: true
		}),
		id: ADA_SINGLE_PARTICIPANT_ID
	};
	await db
		.insert(schema.singleParticipant)
		.values(single)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });

	await seedAttendanceSessions(db, conferenceId);
}

/** Only the ended session with Ada's scan, replacing whatever a run started; scans go along. */
async function seedAttendanceSessions(db: NodePgDatabase, conferenceId: string) {
	await db
		.delete(schema.attendanceSession)
		.where(eq(schema.attendanceSession.conferenceId, conferenceId));

	const startedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
	await db.insert(schema.attendanceSession).values({
		...E2E_ATTENDANCE_ENDED_SESSION,
		conferenceId,
		mode: 'RECORD',
		startedAt,
		endedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
		createdById: E2E_ATTENDANCE_CARE_ID
	});
	await db.insert(schema.attendanceEntry).values({
		conferenceParticipantId: await upsertParticipant(db, conferenceId, E2E_ATTENDANCE_ADA_ID),
		recordedById: E2E_ATTENDANCE_CARE_ID,
		sessionId: E2E_ATTENDANCE_ENDED_SESSION.id,
		timestamp: new Date(startedAt.getTime() + 10 * 60 * 1000)
	});
}
