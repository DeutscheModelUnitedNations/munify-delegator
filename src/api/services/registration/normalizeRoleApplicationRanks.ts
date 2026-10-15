import { schema, type Transaction } from '$api/db/db';
import { eq } from 'drizzle-orm';

/**
 * Renumbers the role applications of a delegation to a gapless 1..n sequence, keeping their order.
 *
 * A gap (left by a delete, or by `tidyRoleApplications`) would make the next "count + 1" rank
 * collide with an existing one. The unique index on (delegationId, rank) is checked per row, so
 * every rank first moves into the negative range and only then gets its final value: no
 * intermediate state collides. The two passes have to run in the caller's transaction: a failure
 * between them would leave the ranks negative.
 */
export async function normalizeRoleApplicationRanks(delegationId: string, tx: Transaction) {
	const applications = await tx.query.roleApplication.findMany({
		where: { delegationId },
		orderBy: { rank: 'asc', createdAt: 'asc' },
		columns: { id: true, rank: true }
	});

	if (applications.every((application, index) => application.rank === index + 1)) return;

	for (const [index, application] of applications.entries()) {
		await tx
			.update(schema.roleApplication)
			.set({ rank: -(index + 1) })
			.where(eq(schema.roleApplication.id, application.id));
	}
	for (const [index, application] of applications.entries()) {
		await tx
			.update(schema.roleApplication)
			.set({ rank: index + 1 })
			.where(eq(schema.roleApplication.id, application.id));
	}
}
