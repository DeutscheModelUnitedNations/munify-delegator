import { config } from '../config';
import { findMailSyncUsers, type MailSyncUser } from './mailSyncUsers';
import { mailSyncUserWhere } from './window';
import { logger } from '#lib/logger';

/**
 * Processes all eligible users in batches using cursor-based pagination.
 * Peak memory usage is limited to ~batchSize users instead of loading all at once.
 * After each batch callback completes, the batch array is eligible for GC.
 *
 * Eligible are users with a global opt-in or a participation in a conference that ended after
 * `cutoff` (see `window.ts`).
 */
export async function processUsersInBatches({
	cutoff,
	callback,
	batchSize = config.MAIL_SYNC_BATCH_SIZE
}: {
	cutoff: Date;
	callback: (users: MailSyncUser[]) => void | Promise<void>;
	batchSize?: number;
}): Promise<number> {
	const eligible = mailSyncUserWhere(cutoff);
	let totalProcessed = 0;
	let lastId: string | undefined;

	while (true) {
		const batch = await findMailSyncUsers({
			where: lastId ? { AND: [eligible, { id: { gt: lastId } }] } : eligible,
			limit: batchSize
		});

		if (batch.length === 0) break;

		await callback(batch);
		totalProcessed += batch.length;
		lastId = batch[batch.length - 1].id;
		logger.debug('Processed user batch', { totalProcessed });

		if (batch.length < batchSize) break;
	}

	return totalProcessed;
}
