import { config } from '../config';
import { tasksDb } from '../tasksDb';
import { mailSyncUserArgs, type MailSyncUser } from './types';
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

	const whereClause = {
		OR: [
			{
				delegationMemberships: {
					some: { conference: { endConference: { lt } } }
				}
			},
			{
				singleParticipant: {
					some: { conference: { endConference: { lt } } }
				}
			},
			{
				conferenceSupervisor: {
					some: { conference: { endConference: { lt } } }
				}
			},
			{
				teamMember: {
					some: { conference: { endConference: { lt } } }
				}
			}
		]
	};

	// eslint-disable-next-line no-constant-condition
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
