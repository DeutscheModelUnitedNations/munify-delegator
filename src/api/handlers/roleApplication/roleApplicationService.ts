import { db, schema } from '$api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { count, eq } from 'drizzle-orm';
import { normalizeRoleApplicationRanks } from '$api/services/registration/normalizeRoleApplicationRanks';

/** Adds an application at the end of the delegation's ranking. Returns the new row. */
export async function appendRoleApplication(args: { delegationId: string; roleId: string }) {
	return db.transaction(async (tx) => {
		// Close any gap first, so "one past the count" cannot collide with an existing rank.
		await normalizeRoleApplicationRanks(args.delegationId, tx);
		const [existing] = await tx
			.select({ value: count() })
			.from(schema.roleApplication)
			.where(eq(schema.roleApplication.delegationId, args.delegationId));

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
		await tx.delete(schema.roleApplication).where(eq(schema.roleApplication.id, application.id));
		await normalizeRoleApplicationRanks(application.delegationId, tx);
	});
}

/** Swaps the ranks of two applications. */
export async function swapRanks(
	first: { id: string; rank: number },
	second: { id: string; rank: number }
) {
	await db.transaction(async (tx) => {
		// (delegationId, rank) is unique, so the first row is parked on a sentinel rank
		// before the two are swapped. The legacy resolver used -1 for the same reason.
		await tx
			.update(schema.roleApplication)
			.set({ rank: -1 })
			.where(eq(schema.roleApplication.id, first.id));
		await tx
			.update(schema.roleApplication)
			.set({ rank: first.rank })
			.where(eq(schema.roleApplication.id, second.id));
		await tx
			.update(schema.roleApplication)
			.set({ rank: second.rank })
			.where(eq(schema.roleApplication.id, first.id));
	});
}
