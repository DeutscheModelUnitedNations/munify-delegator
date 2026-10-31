import { test, expect } from '../support/test';
import pg from 'pg';
import {
	E2E_AGENDA_ITEM_ID,
	E2E_COMMITTEE_ID,
	E2E_CONFERENCE_ID,
	E2E_PAPER_DELEGATE_USER_ID,
	E2E_PAPER_DELEGATION_ID,
	E2E_PREP_COMMITTEE_ID,
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_DELEGATION_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_ROLE_ID,
	E2E_SUPERVISOR_ID,
	E2E_SURVEY_OPTION_A_ID,
	E2E_SURVEY_QUESTION_ID,
	E2E_UNSEATED_COMMITTEE_ID
} from '../seed/seed';

// No foreign key can say "both parents are in the same conference", so the database checks it with
// deferred constraint triggers (the `conference_anchor` migration), and a row's conference_id
// cannot change. These write straight to the database, the way a bug in any code path would, and
// never keep what they write: every case runs in a transaction that is rolled back.

type Case = { name: string; sql: string; params: unknown[] };

let client: pg.Client;
// The participant rows of one person in the main conference and one in the preparation conference.
let here: string;
let there: string;

test.beforeAll(async () => {
	client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	const participant = async (conferenceId: string, userId: string) => {
		const { rows } = await client.query<{ id: string }>(
			'SELECT id FROM conference_participant WHERE conference_id = $1 AND user_id = $2',
			[conferenceId, userId]
		);
		if (!rows[0])
			throw new Error(`no participant ${userId} in ${conferenceId}: is the e2e seed loaded?`);
		return rows[0].id;
	};
	here = await participant(E2E_CONFERENCE_ID, E2E_PAPER_DELEGATE_USER_ID);
	there = await participant(E2E_PREP_CONFERENCE_ID, E2E_PREP_PARTICIPANT_USER_ID);
});

test.afterAll(async () => {
	await client?.end();
});

/** Runs the write with the deferred checks forced to run at once; the error code, if any. */
async function attempt({ sql, params }: Case) {
	await client.query('BEGIN');
	try {
		await client.query('SET CONSTRAINTS ALL IMMEDIATE');
		await client.query(sql, params);
		return null;
	} catch (error) {
		return error instanceof pg.DatabaseError ? (error.constraint ?? error.code) : String(error);
	} finally {
		await client.query('ROLLBACK');
	}
}

const id = () => `e2e-same-conference-${Math.random().toString(36).slice(2)}`;

test('rows whose parents are in different conferences are refused', async () => {
	const crossing: Case[] = [
		{
			name: 'a member of a delegation of another conference',
			// a fresh person row, so no existing membership's unique key answers first
			sql: `WITH p AS (
					INSERT INTO conference_participant (id, conference_id, user_id)
					VALUES ($1, $2, $3) RETURNING id
				)
				INSERT INTO delegation_member (id, delegation_id, conference_participant_id, is_head_delegate)
				SELECT $1, $4, p.id, false FROM p`,
			params: [id(), E2E_CONFERENCE_ID, E2E_PREP_PARTICIPANT_USER_ID, E2E_PREP_DELEGATION_ID]
		},
		{
			name: 'a paper by a participant of another conference',
			sql: `INSERT INTO paper (id, author_participant_id, delegation_id, type)
				VALUES ($1, $2, $3, 'POSITION_PAPER')`,
			params: [id(), there, E2E_PAPER_DELEGATION_ID]
		},
		{
			// the survey question belongs to the preparation conference
			name: 'an answer of a participant of another conference',
			sql: `INSERT INTO survey_answer (id, question_id, option_id, conference_participant_id)
				VALUES ($1, $2, $3, $4)`,
			params: [id(), E2E_SURVEY_QUESTION_ID, E2E_SURVEY_OPTION_A_ID, here]
		},
		{
			name: 'a supervisor of a person in another conference',
			sql: 'INSERT INTO supervision (id, a, b) VALUES ($1, $2, $3)',
			params: [id(), E2E_SUPERVISOR_ID, there]
		},
		{
			name: 'a committee seating a nation role of another conference',
			sql: `INSERT INTO committee_to_role (id, a, b)
				SELECT $1, $2, r.id FROM conference_role r WHERE r.conference_id = $3 LIMIT 1`,
			params: [id(), E2E_COMMITTEE_ID, E2E_PREP_CONFERENCE_ID]
		},
		{
			name: 'a member seated in a committee of another conference',
			sql: `UPDATE delegation_member SET assigned_committee_id = $1 WHERE conference_participant_id = $2`,
			params: [E2E_PREP_COMMITTEE_ID, here]
		},
		{
			name: 'a track for a committee of another conference',
			sql: `WITH t AS (
					INSERT INTO calendar_track (id, name, sort_order, conference_id)
					VALUES ($1, $1, 0, $2) RETURNING id
				)
				INSERT INTO calendar_track_to_committee (id, a, b) SELECT $1, t.id, $3 FROM t`,
			params: [id(), E2E_CONFERENCE_ID, E2E_PREP_COMMITTEE_ID]
		}
	];
	for (const write of crossing) {
		expect(await attempt(write), write.name).toMatch(/_same_conference$/);
	}
});

test('the same writes within one conference pass', async () => {
	const fitting: Case[] = [
		{
			name: 'a supervisor of a person in their own conference',
			sql: 'INSERT INTO supervision (id, a, b) VALUES ($1, $2, $3)',
			params: [id(), E2E_SUPERVISOR_ID, here]
		},
		{
			name: 'a member seated in a committee of their conference',
			sql: `UPDATE delegation_member SET assigned_committee_id = $1 WHERE conference_participant_id = $2`,
			params: [E2E_COMMITTEE_ID, here]
		}
	];
	for (const write of fitting) {
		expect(await attempt(write), write.name).toBeNull();
	}
});

// Delegations hold nations and non-state actors, single participants custom roles, committees seat
// nations (the `conference_role_kind` migration); a role's kind never changes.
test('a role of the wrong kind is refused', async () => {
	const wrongKind: Case[] = [
		{
			name: 'a delegation holding a custom role',
			sql: 'UPDATE delegation SET assigned_role_id = $1 WHERE id = $2',
			params: [E2E_ROLE_ID, E2E_PAPER_DELEGATION_ID]
		},
		{
			name: 'a delegation applying for a custom role',
			sql: 'INSERT INTO role_application (id, delegation_id, role_id, rank) VALUES ($1, $2, $3, 99)',
			params: [id(), E2E_PAPER_DELEGATION_ID, E2E_ROLE_ID]
		},
		{
			name: 'a committee seating a custom role',
			sql: 'INSERT INTO committee_to_role (id, a, b) VALUES ($1, $2, $3)',
			params: [id(), E2E_COMMITTEE_ID, E2E_ROLE_ID]
		},
		{
			name: 'a custom role turned into a non-state actor',
			sql: `UPDATE conference_role SET kind = 'NON_STATE_ACTOR', abbreviation = 'X' WHERE id = $1`,
			params: [E2E_ROLE_ID]
		}
	];
	for (const write of wrongKind) {
		expect(await attempt(write), write.name).toMatch(/_role_kind(_immutable)?$/);
	}
});

// A parent that reaches its conference through a link of its own would take the rows naming it
// along, past their checks: the link may change within the conference, never out of it.
test('a parent cannot carry the rows naming it into another conference', async () => {
	const carrying: Case[] = [
		{
			name: 'an agenda item, with its papers, moved to a committee of another conference',
			sql: 'UPDATE committee_agenda_item SET committee_id = $1 WHERE id = $2',
			params: [E2E_PREP_COMMITTEE_ID, E2E_AGENDA_ITEM_ID]
		},
		{
			name: 'a supervisor, with their supervisions, moved to a person of another conference',
			sql: 'UPDATE conference_supervisor SET conference_participant_id = $1 WHERE id = $2',
			params: [there, E2E_SUPERVISOR_ID]
		},
		{
			// person and delegation move together, so the member's own check passes; its draft
			// rows would follow it
			name: 'a delegation member moved with its delegation to a person of another conference',
			sql: `WITH p AS (
					INSERT INTO conference_participant (id, conference_id, user_id)
					VALUES ($1, $2, $3) RETURNING id
				)
				UPDATE delegation_member SET delegation_id = $4, conference_participant_id = p.id,
					assigned_committee_id = NULL
				FROM p WHERE conference_participant_id = $5`,
			params: [
				id(),
				E2E_PREP_CONFERENCE_ID,
				E2E_PAPER_DELEGATE_USER_ID,
				E2E_PREP_DELEGATION_ID,
				here
			]
		}
	];
	for (const write of carrying) {
		expect(await attempt(write), write.name).toMatch(/_conference_immutable$/);
	}
	expect(
		await attempt({
			name: 'an agenda item moved to another committee of its conference',
			sql: 'UPDATE committee_agenda_item SET committee_id = $1 WHERE id = $2',
			params: [E2E_UNSEATED_COMMITTEE_ID, E2E_AGENDA_ITEM_ID]
		})
	).toBeNull();
});

test('a row cannot move to another conference, rewriting its conference changes nothing', async () => {
	expect(
		await attempt({
			name: 'move',
			sql: 'UPDATE delegation SET conference_id = $1 WHERE id = $2',
			params: [E2E_PREP_CONFERENCE_ID, E2E_PAPER_DELEGATION_ID]
		})
	).toBe('delegation_conference_id_immutable');
	expect(
		await attempt({
			name: 'rewrite',
			sql: 'UPDATE delegation SET conference_id = $1 WHERE id = $2',
			params: [E2E_CONFERENCE_ID, E2E_PAPER_DELEGATION_ID]
		})
	).toBeNull();
});

// Tracks are the conference's and run on some of its days; an entry runs only on its day's.
test('an entry runs only on the tracks of its day', async () => {
	const entryOnTrack = ({ trackRunsOnDay }: { trackRunsOnDay: boolean }): Case => ({
		name: trackRunsOnDay ? 'on a track of its day' : 'on a track its day does not have',
		sql: `WITH d AS (
				INSERT INTO calendar_day (id, date, name, sort_order, conference_id)
				VALUES ($1, now(), $1, $3, $2) RETURNING id
			), t AS (
				INSERT INTO calendar_track (id, name, sort_order, conference_id)
				VALUES ($1, $1, 0, $2) RETURNING id
			), runs AS (
				INSERT INTO calendar_day_to_calendar_track (id, a, b)
				SELECT $1, d.id, t.id FROM d, t WHERE $4
			), e AS (
				INSERT INTO calendar_entry (id, start_time, end_time, name, calendar_day_id)
				SELECT $1, now(), now(), $1, d.id FROM d RETURNING id
			)
			INSERT INTO calendar_entry_to_calendar_track (id, a, b) SELECT $1, e.id, t.id FROM e, t`,
		params: [id(), E2E_CONFERENCE_ID, 100_000 + Math.floor(Math.random() * 100_000), trackRunsOnDay]
	});
	expect(await attempt(entryOnTrack({ trackRunsOnDay: false }))).toBe(
		'calendar_entry_track_runs_on_day'
	);
	expect(await attempt(entryOnTrack({ trackRunsOnDay: true }))).toBeNull();
});
