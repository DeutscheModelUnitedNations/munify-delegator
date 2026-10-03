import type { DB } from '$db/db';

/**
 * Renumbers the role applications of a delegation to a gapless 1..n sequence, keeping their order.
 *
 * The unique index on (delegationId, rank) is checked per row, so we first move every rank into the
 * negative range and only then assign the final values. This way no intermediate state collides.
 */
export async function normalizeRoleApplicationRanks(db: DB, delegationId: string) {
	const applications = await db.roleApplication.findMany({
		where: { delegationId },
		orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
		select: { id: true, rank: true }
	});

	if (applications.every((application, index) => application.rank === index + 1)) return;

	for (const [index, application] of applications.entries()) {
		await db.roleApplication.update({
			where: { id: application.id },
			data: { rank: -(index + 1) }
		});
	}

	for (const [index, application] of applications.entries()) {
		await db.roleApplication.update({
			where: { id: application.id },
			data: { rank: index + 1 }
		});
	}
}
