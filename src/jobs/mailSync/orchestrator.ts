import { config } from '../config';
import { db } from '../db';
import { logTaskStart, logTaskEnd, taskError } from '../logs';
import { ensureListsExist } from './listManager';
import { fetchSubscriberMap } from './subscriberFetcher';
import { processUsersInBatches } from './userProcessor';
import { planUserBatch, planReleases } from './subscriberDiff';
import { executeActions, collectGarbage } from './subscriberActions';
import { retentionCutoff } from './window';
import type { ListmonkSubscriber, SyncPlan } from './types';
import { logger } from '#lib/logger';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

export async function runMailSync(): Promise<void> {
	const startTime = logTaskStart(TASK_NAME);
	try {
		if (!config.LISTMONK_API_URL || config.LISTMONK_API_URL === '') {
			taskError({ taskName: TASK_NAME, message: 'Listmonk API URL is not set. Aborting task.' });
			return;
		}

		// STEP 1: Ensure all required lists exist and get listName -> listId mapping
		logger.info('Step 1: updating lists');

		const conferences = await db.query.conference.findMany({ columns: { id: true, title: true } });
		const listNameToId = await ensureListsExist(conferences);
		if (!listNameToId) return;

		// STEP 2 (Pass 1 — Plan): compare every user with Listmonk, keep only the planned actions
		logger.info('Step 2: planning changes');

		let subscriberMap: Map<string, ListmonkSubscriber> | undefined = await fetchSubscriberMap([
			...listNameToId.values()
		]);
		if (!subscriberMap) {
			taskError({
				taskName: TASK_NAME,
				message: 'Could not fetch all subscribers from Listmonk. Aborting task.'
			});
			return;
		}
		logger.info('Fetched subscribers from Listmonk', { count: subscriberMap.size });

		const plan: SyncPlan = { userActions: [], releases: [], upToDate: 0, skippedNoLists: 0 };

		const cutoff = retentionCutoff();
		logger.info('Counting conferences that ended after the cutoff', {
			cutoff: cutoff.toISOString()
		});
		const totalUsers = await processUsersInBatches({
			cutoff,
			callback: (batch) => {
				planUserBatch({ users: batch, subscriberMap: subscriberMap!, listNameToId, plan, cutoff });
			}
		});
		planReleases({ subscriberMap, plan });

		const creates = plan.userActions.filter((a) => a.kind === 'create').length;
		logger.info('Plan summary', {
			usersLoaded: totalUsers,
			usersWithoutLists: plan.skippedNoLists,
			upToDate: plan.upToDate,
			toCreate: creates,
			toUpdate: plan.userActions.length - creates,
			toRelease: plan.releases.length
		});

		// Release subscriber map for GC before Pass 2
		subscriberMap = undefined;

		// STEP 3 (Pass 2 — Execute)
		logger.info('Step 3: executing changes');

		await executeActions({ label: 'user changes', actions: plan.userActions });
		await executeActions({ label: 'releases', actions: plan.releases });

		// STEP 4: Delete subscribers that are left without any list, ours or anyone else's
		logger.info('Step 4: collecting garbage');

		await collectGarbage();
	} catch (error) {
		taskError({
			taskName: TASK_NAME,
			message: 'Task failed.',
			error: error instanceof Error ? error : String(error)
		});
	} finally {
		logTaskEnd({ taskName: TASK_NAME, startTime });
	}
}
