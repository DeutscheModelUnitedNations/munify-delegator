import { test, expect } from '../support/test';
import pg from 'pg';
import { E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID, E2E_PAPER_DELEGATE_USER_ID } from '../seed/seed';

// A person takes part in a conference in one way only: delegation member, single participant,
// supervisor or team. The registration flows check it first, and the database refuses it with
// deferred constraint triggers (the `one_part_per_conference` migration). These write straight to
// the database, the way a bug in any code path would, and never keep what they write: every case
// runs in a transaction that is rolled back.

type Case = { name: string; sql: string; params: unknown[] };

let client: pg.Client;
// The participant row of a delegation member of the main conference.
let delegate: string;

test.beforeAll(async () => {
	client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	const { rows } = await client.query<{ id: string }>(
		`SELECT p.id FROM conference_participant p
			JOIN delegation_member m ON m.conference_participant_id = p.id
			WHERE p.conference_id = $1 AND p.user_id = $2`,
		[E2E_CONFERENCE_ID, E2E_PAPER_DELEGATE_USER_ID]
	);
	if (!rows[0]) throw new Error('no delegation member to work with: is the e2e seed loaded?');
	delegate = rows[0].id;
});

test.afterAll(async () => {
	await client?.end();
});

/**
 * Runs the writes in one transaction, with the deferred checks running at commit as they would
 * for the app; the error's constraint, if any.
 */
async function attempt(writes: Case[]) {
	await client.query('BEGIN');
	try {
		for (const { sql, params } of writes) await client.query(sql, params);
		await client.query('SET CONSTRAINTS ALL IMMEDIATE');
		return null;
	} catch (error) {
		return error instanceof pg.DatabaseError ? (error.constraint ?? error.code) : String(error);
	} finally {
		await client.query('ROLLBACK');
	}
}

const id = () => `e2e-one-part-${Math.random().toString(36).slice(2)}`;

const singleParticipant = (participantId: string): Case => ({
	name: 'single participant',
	sql: 'INSERT INTO single_participant (id, conference_participant_id) VALUES ($1, $2)',
	params: [id(), participantId]
});

test('a second part in the same conference is refused', async () => {
	const second: Case[] = [
		{ ...singleParticipant(delegate), name: 'a delegation member as single participant' },
		{
			name: 'a delegation member as supervisor',
			sql: `INSERT INTO conference_supervisor
					(id, conference_participant_id, plans_own_attendence_at_conference, connection_code)
				VALUES ($1, $2, false, $1)`,
			params: [id(), delegate]
		},
		{
			name: 'a delegation member on the team',
			sql: 'INSERT INTO team_member (id, conference_id, user_id) VALUES ($1, $2, $3)',
			params: [id(), E2E_CONFERENCE_ID, E2E_PAPER_DELEGATE_USER_ID]
		},
		{
			name: 'a team member as single participant',
			sql: `WITH p AS (
					INSERT INTO conference_participant (id, conference_id, user_id)
					VALUES ($1, $2, $3) RETURNING id
				)
				INSERT INTO single_participant (id, conference_participant_id) SELECT $1, p.id FROM p`,
			params: [id(), E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID]
		}
	];
	for (const write of second) {
		expect(await attempt([write]), write.name).toBe('one_part_per_conference');
	}
});

test('swapping one part for another within a transaction passes', async () => {
	expect(
		await attempt([
			singleParticipant(delegate),
			{
				name: 'leave the delegation',
				sql: 'DELETE FROM delegation_member WHERE conference_participant_id = $1',
				params: [delegate]
			}
		])
	).toBeNull();
});
