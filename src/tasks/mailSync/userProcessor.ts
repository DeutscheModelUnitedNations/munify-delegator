import { config } from '../config';
import { tasksDb } from '../tasksDb';
import { mailSyncUserArgs, type MailSyncUser } from './types';
import { mailSyncUserWhere } from './window';

/**
 * Processes all eligible users in batches using cursor-based pagination.
 * Peak memory usage is limited to ~batchSize users instead of loading all at once.
 * After each batch callback completes, the batch array is eligible for GC.
 *
 * Eligible are users with a global opt-in or a participation in a conference that ended after
 * `cutoff` (see `window.ts`).
 */
export async function processUsersInBatches(
	cutoff: Date,
	callback: (users: MailSyncUser[]) => void | Promise<void>,
	batchSize: number = config.MAIL_SYNC_BATCH_SIZE
): Promise<number> {
	const whereClause = mailSyncUserWhere(cutoff);
	let totalProcessed = 0;
	let lastId: string | undefined;

	while (true) {
		const batch = await tasksDb.user.findMany({
			take: batchSize,
			...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
			orderBy: { id: 'asc' },
			where: whereClause,
			...mailSyncUserArgs
		});

		if (batch.length === 0) break;

		await callback(batch);
		totalProcessed += batch.length;
		lastId = batch[batch.length - 1].id;
		console.info(`  Processed user batch: ${totalProcessed} users so far`);

		if (batch.length < batchSize) break;
	}

	return totalProcessed;
}
