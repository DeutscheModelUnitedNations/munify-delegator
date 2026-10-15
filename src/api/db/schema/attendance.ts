import { snakeCase, pgEnum, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps } from './helpers';
import { userRef } from './users';
import { conferenceRef } from './conference';
import { conferenceParticipant } from './participants';

/** Scanner sessions and the attendance they record. */

export const attendanceSessionMode = pgEnum('attendance_session_mode', [
	'CHECK',
	'RECORD',
	'BADGE'
]);

/**
 * One run of the scanner: an occasion, started by a team member and ended by them. Its id is
 * made by the client, so starting it can wait in the offline queue and be repeated safely.
 */
export const attendanceSession = snakeCase.table('attendance_session', {
	...defaultIdAndTimestamps,
	conferenceId: conferenceRef('cascade'),
	occasion: text().notNull(),
	startedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	endedAt: timestamp({ precision: 3 }),
	createdById: userRef('restrict'),
	mode: attendanceSessionMode().default('RECORD').notNull()
});

export const attendanceEntry = snakeCase.table('attendance_entry', {
	...defaultIdAndTimestamps,
	timestamp: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	conferenceParticipantId: text()
		.notNull()
		.references(() => conferenceParticipant.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	recordedById: userRef('restrict'),
	/** The scanner session the scan belongs to, which also says what the occasion was. */
	sessionId: text()
		.notNull()
		.references(() => attendanceSession.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	/**
	 * Whether the participant had no open issue when scanned in check mode, as it was at that
	 * moment. Empty when nothing was checked (record mode, older entries).
	 */
	checkPassed: boolean()
});
