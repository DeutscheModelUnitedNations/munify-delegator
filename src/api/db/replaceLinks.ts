import type { Transaction } from '#api/db/db';
import type { implicitManyToMany } from '#api/db/schema/helpers';
import { whereRows } from '#api/db/whereRows';

type LinkTable = ReturnType<typeof implicitManyToMany<string>>;

/** Makes `bIds` (duplicates dropped) the rows `table` links `aId` to; `[]` removes every link. */
export async function replaceLinks({
	tx,
	table,
	aId,
	bIds
}: {
	tx: Transaction;
	table: LinkTable;
	aId: string;
	bIds: readonly string[];
}) {
	await tx.delete(table).where(whereRows({ table, filter: { a: aId } }));
	const distinct = [...new Set(bIds)];
	if (distinct.length > 0) {
		await tx.insert(table).values(distinct.map((bId) => ({ a: aId, b: bId })));
	}
}
