import { config } from '../config';
import { tasksDb } from '../tasksDb';
import { logTaskStart, logTaskEnd, taskError } from '../logs';
import { ensureListsExist } from './listManager';
import { fetchSubscriberMap } from './subscriberFetcher';
import { processUsersInBatches } from './userProcessor';
import {
	classifyUserBatch,
	collectDeleteIds,
	executeDeletes,
	executeBatch
} from './subscriberDiff';
import type { ClassificationResult, BatchExecutionResult, ListmonkSubscriber } from './types';

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

		// STEP 2 (Pass 1 — Classify): Load users in batches, store only lightweight identifiers
		console.info('\nSTEP 2: Classifying Subscribers');
		console.info('===============================');

		let subscriberMap: Map<string, ListmonkSubscriber> | null = await fetchSubscriberMap();
		console.info(`Fetched ${subscriberMap.size} subscribers from Listmonk`);

		const classification: ClassificationResult = {
			createEmails: new Set(),
			updateSubscriberIds: new Map(),
			deleteSubscriberIds: [],
			upToDate: 0,
			skippedNoLists: 0
		};

		const totalUsers = await processUsersInBatches((batch) => {
			classifyUserBatch(batch, subscriberMap!, classification);
		});

		classification.deleteSubscriberIds = collectDeleteIds(subscriberMap);

		console.info(`\nClassification summary:`);
		console.info(`  Users loaded:        ${totalUsers}`);
		console.info(`  Users without lists:  ${classification.skippedNoLists}`);
		console.info(`  Subscribers matched:  ${classification.upToDate} (up to date)`);
		console.info(`  To create:           ${classification.createEmails.size}`);
		console.info(`  To update:           ${classification.updateSubscriberIds.size}`);
		console.info(`  To delete:           ${classification.deleteSubscriberIds.length}`);

		// Release subscriber map for GC before Pass 2
		subscriberMap = null;

		// STEP 3 (Pass 2 — Execute): Delete orphans, then create/update in batches
		console.info('\nSTEP 3: Executing Changes');
		console.info('=========================');

		// Delete before create to free up email addresses that may conflict
		await executeDeletes(classification.deleteSubscriberIds);
		classification.deleteSubscriberIds = [];

		if (classification.createEmails.size > 0 || classification.updateSubscriberIds.size > 0) {
			let totalCreated = 0;
			let totalCreateFailed = 0;
			let totalUpdated = 0;
			let totalUpdateFailed = 0;

			await processUsersInBatches(async (batch) => {
				const result: BatchExecutionResult = await executeBatch(
					batch,
					classification,
					listNameToId
				);
				totalCreated += result.created;
				totalCreateFailed += result.createFailed;
				totalUpdated += result.updated;
				totalUpdateFailed += result.updateFailed;
			});

			console.info(`\nExecution summary:`);
			console.info(`  Created: ${totalCreated} succeeded, ${totalCreateFailed} failed`);
			console.info(`  Updated: ${totalUpdated} succeeded, ${totalUpdateFailed} failed`);
		}
	} catch (error) {
		console.error(`Task "${TASK_NAME}" failed:`, error);
	} finally {
		logTaskEnd(TASK_NAME, startTime);
	}
}
