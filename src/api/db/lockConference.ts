import { schema, type Transaction } from './db';
import { whereRows } from './whereRows';

/**
 * Locks the conference row until the transaction ends, so changes to one conference that must not
 * interleave (applying the assignment, placing someone into a seat, taking project management
 * away) wait for each other. Reads afterwards see what the transaction before committed.
 */
export async function lockConference({
	tx,
	conferenceId
}: {
	tx: Transaction;
	conferenceId: string;
}) {
	await tx
		.select({ id: schema.conference.id })
		.from(schema.conference)
		.where(whereRows({ table: schema.conference, filter: { id: conferenceId } }))
		.for('update');
}
