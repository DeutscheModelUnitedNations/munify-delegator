import { config } from '../config';
import { tasksDb } from '../tasksDb';
import { logTaskStart, logTaskEnd, taskError } from '../logs';
import { ensureListsExist } from './listManager';
import { fetchSubscriberMap } from './subscriberFetcher';
import { processUsersInBatches } from './userProcessor';
import {
	classifyUserBatch,
	collectDeletes,
	executeCreates,
	executeUpdates,
	executeDeletes
} from './subscriberDiff';
import type { SyncDiff } from './types';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

export async function runMailSync(): Promise<void> {
	const startTime = logTaskStart(TASK_NAME);
	try {
		if (!config.LISTMONK_API_URL || config.LISTMONK_API_URL === '') {
			taskError(TASK_NAME, 'Listmonk API URL is not set. Aborting task.');
			return;
		}

		// Fetch all Listmonk subscribers into a Map (O(n) insertion instead of O(n²) spread)
		const subscriberMap = await fetchSubscriberMap();
		console.info(`Fetched ${subscriberMap.size} subscribers from Listmonk`);

		// Ensure all required lists exist and get listName -> listId mapping
		console.info('\nSTEP 1: Updating Lists');
		console.info('======================');

		const conferences = await tasksDb.conference.findMany();
		const listNameToId = await ensureListsExist(conferences);
		if (!listNameToId) return;

		// Single-pass classification of users against subscribers
		console.info('\nSTEP 2: Creating, Deleting and Updating Subscribers');
		console.info('===================================================');

		const diff: SyncDiff = {
			toCreate: [],
			toUpdate: [],
			toDelete: [],
			upToDate: 0,
			skippedNoLists: 0
		};

		const totalUsers = await processUsersInBatches((batch) => {
			classifyUserBatch(batch, subscriberMap, diff);
		});

		// Remaining subscribers in the map are orphans to delete
		collectDeletes(subscriberMap, diff);

		console.info(`\nClassification summary:`);
		console.info(`  Users loaded:        ${totalUsers}`);
		console.info(`  Users without lists:  ${diff.skippedNoLists}`);
		console.info(`  Subscribers matched:  ${diff.upToDate} (up to date)`);
		console.info(`  To create:           ${diff.toCreate.length}`);
		console.info(`  To update:           ${diff.toUpdate.length}`);
		console.info(`  To delete:           ${diff.toDelete.length}`);

		// Delete before create to free up email addresses that may conflict
		await executeDeletes(diff);
		await executeCreates(diff, listNameToId);
		await executeUpdates(diff, listNameToId);
	} catch (error) {
		console.error(`Task "${TASK_NAME}" failed:`, error);
	} finally {
		logTaskEnd(TASK_NAME, startTime);
	}
}
