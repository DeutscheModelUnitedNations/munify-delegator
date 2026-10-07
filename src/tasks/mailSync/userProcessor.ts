import { config } from '../config';
import { findMailSyncUsers, type MailSyncUser } from './mailSyncUsers';
import dayjs from 'dayjs';

/**
 * Processes all eligible users in batches using cursor-based pagination.
 * Peak memory usage is limited to ~batchSize users instead of loading all at once.
 * After each batch callback completes, the batch array is eligible for GC.
 */
export async function processUsersInBatches(
	callback: (users: MailSyncUser[]) => void | Promise<void>,
	batchSize: number = config.MAIL_SYNC_BATCH_SIZE
): Promise<number> {
	const lt = dayjs().add(10, 'month').toDate();
	let totalProcessed = 0;
	let lastId: string | undefined;

	const participatesInARecentConference = {
		OR: [
			{ delegationMemberships: { conference: { endConference: { lt } } } },
			{ singleParticipant: { conference: { endConference: { lt } } } },
			{ conferenceSupervisor: { conference: { endConference: { lt } } } },
			{ teamMember: { conference: { endConference: { lt } } } }
		]
	};

	while (true) {
		const batch = await findMailSyncUsers({
			where: lastId
				? { AND: [participatesInARecentConference, { id: { gt: lastId } }] }
				: participatesInARecentConference,
			limit: batchSize
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
