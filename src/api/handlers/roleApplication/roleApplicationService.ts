import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { count } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { normalizeRoleApplicationRanks } from './normalizeRoleApplicationRanks';

/** Adds an application at the end of the delegation's ranking. Returns the new row. */
export async function appendRoleApplication(args: { delegationId: string; roleId: string }) {
	return db.transaction(async (tx) => {
		// Close any gap first, so "one past the count" cannot collide with an existing rank.
		await normalizeRoleApplicationRanks({ delegationId: args.delegationId, tx });
		const [existing] = await tx
			.select({ value: count() })
			.from(schema.roleApplication)
			.where(
				whereRows({ table: schema.roleApplication, filter: { delegationId: args.delegationId } })
			);

		return tx
			.insert(schema.roleApplication)
			.values({
				delegationId: args.delegationId,
				roleId: args.roleId,
				rank: (existing?.value ?? 0) + 1
			})
			.returning()
			.then(assertFirstEntryExists);
	});
}

/** Deletes an application and closes the gap it leaves in the delegation's ranking. */
export async function removeRoleApplication(application: { id: string; delegationId: string }) {
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.roleApplication)
			.where(whereRows({ table: schema.roleApplication, filter: { id: application.id } }));
		await normalizeRoleApplicationRanks({ delegationId: application.delegationId, tx });
	});
}

/** Swaps the ranks of two applications. */
export async function swapRanks({
	first,
	second
}: {
	first: { id: string; rank: number };
	second: { id: string; rank: number };
}) {
	await db.transaction(async (tx) => {
		// (delegationId, rank) is unique, so the first row is parked on a sentinel rank
		// before the two are swapped. The legacy resolver used -1 for the same reason.
		await tx
			.update(schema.roleApplication)
			.set({ rank: -1 })
			.where(whereRows({ table: schema.roleApplication, filter: { id: first.id } }));
		await tx
			.update(schema.roleApplication)
			.set({ rank: first.rank })
			.where(whereRows({ table: schema.roleApplication, filter: { id: second.id } }));
		await tx
			.update(schema.roleApplication)
			.set({ rank: second.rank })
			.where(whereRows({ table: schema.roleApplication, filter: { id: first.id } }));
	});
}
