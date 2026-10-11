import { db as database, schema, type Transaction } from '$api/db/db';
import { eq } from 'drizzle-orm';

/**
 * Renumbers the role applications of a delegation to a gapless 1..n sequence, keeping their order.
 *
 * A gap (left by a delete, or by `tidyRoleApplications`) would make the next "count + 1" rank
 * collide with an existing one. The unique index on (delegationId, rank) is checked per row, so
 * every rank first moves into the negative range and only then gets its final value: no
 * intermediate state collides.
 */
export async function normalizeRoleApplicationRanks(
	delegationId: string,
	db: Transaction | typeof database = database
) {
	const applications = await db.query.roleApplication.findMany({
		where: { delegationId },
		orderBy: { rank: 'asc', createdAt: 'asc' },
		columns: { id: true, rank: true }
	});

	if (applications.every((application, index) => application.rank === index + 1)) return;

	for (const [index, application] of applications.entries()) {
		await db
			.update(schema.roleApplication)
			.set({ rank: -(index + 1) })
			.where(eq(schema.roleApplication.id, application.id));
	}
	for (const [index, application] of applications.entries()) {
		await db
			.update(schema.roleApplication)
			.set({ rank: index + 1 })
			.where(eq(schema.roleApplication.id, application.id));
	}
}
