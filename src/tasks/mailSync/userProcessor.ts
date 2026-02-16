import { tasksDb } from '../tasksDb';
import type { MailSyncUser } from './types';
import dayjs from 'dayjs';

const BATCH_SIZE = 500;

/**
 * Processes all eligible users in batches using cursor-based pagination.
 * Peak memory usage is limited to ~BATCH_SIZE users instead of loading all at once.
 * After each batch callback completes, the batch array is eligible for GC.
 */
export async function processUsersInBatches(
	callback: (users: MailSyncUser[]) => void
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

	const includeClause = {
		delegationMemberships: {
			include: {
				delegation: {
					include: {
						conference: true
					}
				}
			}
		},
		singleParticipant: {
			include: {
				conference: true
			}
		},
		conferenceSupervisor: {
			include: {
				conference: true,
				supervisedDelegationMembers: {
					include: {
						delegation: true
					}
				},
				supervisedSingleParticipants: true
			}
		},
		teamMember: {
			include: {
				conference: true
			}
		}
	};

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const batch: MailSyncUser[] = await tasksDb.user.findMany({
			take: BATCH_SIZE,
			...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
			orderBy: { id: 'asc' },
			where: whereClause,
			include: includeClause
		});

		if (batch.length === 0) break;

		callback(batch);
		totalProcessed += batch.length;
		lastId = batch[batch.length - 1].id;
		console.info(`  Processed user batch: ${totalProcessed} users so far`);

		if (batch.length < BATCH_SIZE) break;
	}

	return totalProcessed;
}
