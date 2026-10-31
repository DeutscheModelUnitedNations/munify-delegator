import { snakeCase, pgEnum, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps, implicitManyToMany } from './helpers';
import { userRef } from './users';
import { conferenceRef } from './conference';
import { conferenceParticipant } from './participants';
import { surveyOption } from './surveys';

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
	mode: attendanceSessionMode().default('RECORD').notNull(),
	/**
	 * Whether the occasion is listed on the participation certificates. Kept alike for every
	 * session of one occasion: certificates list occasions, not sessions.
	 */
	showOnCertificate: boolean().default(true).notNull()
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

/**
 * The survey options a checking session expects (`a` the session, `b` the option): a scanned person
 * who picked none of them is shown that as an open point. A session without any checks no choice;
 * a session that only records never has any. Deleting an option drops the expectation.
 */
export const attendanceSessionToSurveyOption = implicitManyToMany({
	name: 'attendance_session_to_survey_option',
	a: () => attendanceSession.id,
	b: () => surveyOption.id
});
