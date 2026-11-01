import { schema, type Transaction } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';

/**
 * Locks the delegation row until the transaction ends, so writes that read and replace its rows
 * (its ranking, its draft units) wait for each other.
 */
export async function lockDelegation({
	tx,
	delegationId
}: {
	tx: Transaction;
	delegationId: string;
}) {
	await tx
		.select({ id: schema.delegation.id })
		.from(schema.delegation)
		.where(whereRows({ table: schema.delegation, filter: { id: delegationId } }))
		// Not `update`: that would also block inserts of rows referencing the delegation.
		.for('no key update');
}
