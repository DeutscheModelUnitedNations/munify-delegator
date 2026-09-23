import { config } from '../config';
import { tasksDb } from '../tasksDb';
import { logTaskStart, logTaskEnd, taskError } from '../logs';
import { ensureListsExist } from './listManager';
import { fetchSubscriberMap } from './subscriberFetcher';
import { processUsersInBatches } from './userProcessor';
import { planUserBatch, planReleases } from './subscriberDiff';
import { executeActions, collectGarbage } from './subscriberActions';
import type { ListmonkSubscriber, SyncPlan } from './types';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

export async function runMailSync(): Promise<void> {
	const startTime = logTaskStart(TASK_NAME);
	try {
		if (!config.LISTMONK_API_URL || config.LISTMONK_API_URL === '') {
			taskError(TASK_NAME, 'Listmonk API URL is not set. Aborting task.');
			return;
		}

		// STEP 1: Ensure all required lists exist and get listName -> listId mapping
		console.info('\nSTEP 1: Updating Lists');
		console.info('======================');

		const conferences = await tasksDb.conference.findMany();
		const listNameToId = await ensureListsExist(conferences);
		if (!listNameToId) return;

		// STEP 2 (Pass 1 — Plan): compare every user with Listmonk, keep only the planned actions
		console.info('\nSTEP 2: Planning Changes');
		console.info('========================');

		let subscriberMap: Map<string, ListmonkSubscriber> | undefined = await fetchSubscriberMap();
		if (!subscriberMap) {
			taskError(TASK_NAME, 'Could not fetch all subscribers from Listmonk. Aborting task.');
			return;
		}
		console.info(`Fetched ${subscriberMap.size} subscribers from Listmonk`);

		const plan: SyncPlan = { userActions: [], releases: [], upToDate: 0, skippedNoLists: 0 };

		const totalUsers = await processUsersInBatches((batch) => {
			planUserBatch(batch, subscriberMap!, listNameToId, plan);
		});
		planReleases(subscriberMap, plan);

		const creates = plan.userActions.filter((a) => a.kind === 'create').length;
		console.info(`\nPlan summary:`);
		console.info(`  Users loaded:         ${totalUsers}`);
		console.info(`  Users without lists:  ${plan.skippedNoLists}`);
		console.info(`  Up to date:           ${plan.upToDate}`);
		console.info(`  To create:            ${creates}`);
		console.info(`  To update:            ${plan.userActions.length - creates}`);
		console.info(`  To release:           ${plan.releases.length}`);

		// Release subscriber map for GC before Pass 2
		subscriberMap = undefined;

		// STEP 3 (Pass 2 — Execute)
		console.info('\nSTEP 3: Executing Changes');
		console.info('=========================');

		await executeActions('user changes', plan.userActions);
		await executeActions('releases', plan.releases);

		// STEP 4: Delete subscribers that are left without any list, ours or anyone else's
		console.info('\nSTEP 4: Collecting Garbage');
		console.info('==========================');

		await collectGarbage();
	} catch (error) {
		console.error(`Task "${TASK_NAME}" failed:`, error);
	} finally {
		logTaskEnd(TASK_NAME, startTime);
	}
}
