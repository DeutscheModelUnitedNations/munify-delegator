import { listmonkClient } from '../apis/listmonk/listmonkClient';
import deepEquals from '../helper/deepEquals';
import { computeSubscriberState } from './listRules';
import type {
	MailSyncUser,
	ListmonkSubscriber,
	ComputedSubscriberState,
	SubscriberAttribs,
	ClassificationResult,
	BatchExecutionResult
} from './types';

// TYPE-SAFETY-EXCEPTION: openapi-fetch generates `Record<string, unknown>` for attribs,
// but we use a strongly-typed SubscriberAttribs interface internally. This helper bridges
// the boundary to the Listmonk API.
function attribsForApi(attribs: SubscriberAttribs): Record<string, unknown> {
	return attribs as unknown as Record<string, unknown>;
}

function errorToString(res: { error?: unknown }): string {
	if (res.error == null) return 'Unknown error';
	return typeof res.error === 'string' ? res.error : JSON.stringify(res.error, null, 2);
}

/**
 * Checks if a Listmonk subscriber already matches the computed desired state.
 */
function subscriberMatchesState(
	subscriber: ListmonkSubscriber,
	state: ComputedSubscriberState
): boolean {
	const subscriberListNames = subscriber.lists.map((l) => l.name);

	const listsMatch =
		subscriberListNames.length === state.listNames.length &&
		subscriberListNames.every((name) => state.listNames.includes(name)) &&
		state.listNames.every((name) => subscriberListNames.includes(name));

	const emailMatches = subscriber.email.toLowerCase() === state.email.toLowerCase();
	const nameMatches = subscriber.name === state.formattedName;
	const attribsMatch = deepEquals(subscriber.attribs, state.attribs);

	return listsMatch && emailMatches && nameMatches && attribsMatch;
}

/**
 * Classifies a batch of users against the subscriber Map, storing only lightweight identifiers.
 * - Users without a matching subscriber → createEmails set
 * - Users with a non-matching subscriber → updateSubscriberIds map (subscriber removed from Map)
 * - Users with a matching subscriber → no action (subscriber removed from Map)
 * - Users with zero computed lists → skipped (subscriber stays in Map for deletion)
 */
export function classifyUserBatch(
	users: MailSyncUser[],
	subscriberMap: Map<string, ListmonkSubscriber>,
	classification: ClassificationResult
): void {
	for (const user of users) {
		const state = computeSubscriberState(user);

		if (state.listNames.length === 0) {
			classification.skippedNoLists++;
			continue;
		}

		const emailKey = user.email.toLowerCase().trim();
		const subscriber = subscriberMap.get(emailKey);

		if (!subscriber) {
			classification.createEmails.add(emailKey);
		} else if (!subscriberMatchesState(subscriber, state)) {
			classification.updateSubscriberIds.set(emailKey, subscriber.id);
			subscriberMap.delete(emailKey);
		} else {
			classification.upToDate++;
			subscriberMap.delete(emailKey);
		}
	}
}

/**
 * After all user batches have been processed, any remaining subscribers in the Map
 * are orphans that should be deleted. Returns only their IDs.
 */
export function collectDeleteIds(subscriberMap: Map<string, ListmonkSubscriber>): number[] {
	const ids: number[] = [];
	for (const subscriber of subscriberMap.values()) {
		ids.push(subscriber.id);
	}
	return ids;
}

/**
 * Executes delete operations against the Listmonk API using subscriber IDs.
 */
export async function executeDeletes(subscriberIds: number[]): Promise<void> {
	if (subscriberIds.length === 0) return;

	const total = subscriberIds.length;
	let succeeded = 0;
	let failed = 0;

	console.info(`\nExecuting Delete operations: 0/${total}`);
	for (const id of subscriberIds) {
		const res = await listmonkClient.DELETE(`/subscribers/{id}`, {
			params: {
				path: { id }
			}
		});
		if (res.error) {
			failed++;
			console.error(
				`  ! Failed to delete subscriber ${id}: Listmonk API Error\n${errorToString(res)}`
			);
		} else {
			succeeded++;
			console.info(`  - Deleted subscriber ${id} [${succeeded + failed}/${total}]`);
		}
	}
	console.info(`Delete operations finished: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Executes create and update operations for a single batch of users.
 * Re-computes subscriber state (cheap CPU) to avoid retaining full objects across batches.
 * Removes processed entries from classification sets/maps so they shrink over time.
 */
export async function executeBatch(
	users: MailSyncUser[],
	classification: ClassificationResult,
	listNameToId: Map<string, number>
): Promise<BatchExecutionResult> {
	const result: BatchExecutionResult = {
		created: 0,
		createFailed: 0,
		updated: 0,
		updateFailed: 0
	};

	for (const user of users) {
		const emailKey = user.email.toLowerCase().trim();
		const subscriberId = classification.updateSubscriberIds.get(emailKey);
		const needsCreate = classification.createEmails.has(emailKey);

		if (!needsCreate && subscriberId === undefined) continue;

		const state = computeSubscriberState(user);
		if (state.listNames.length === 0) continue;

		const listIds = state.listNames
			.map((name) => listNameToId.get(name))
			.filter((id): id is number => id !== undefined);

		if (needsCreate) {
			const res = await listmonkClient.POST('/subscribers', {
				body: {
					email: state.email,
					name: state.formattedName,
					attribs: attribsForApi(state.attribs),
					lists: listIds
				}
			});
			if (res.error) {
				result.createFailed++;
				console.error(
					`  ! Failed to create subscriber for user ${user.id}: Listmonk API Error\n${errorToString(res)}`
				);
			} else {
				result.created++;
				console.info(`  - Created subscriber for user ${user.id}`);
			}
			classification.createEmails.delete(emailKey);
		} else if (subscriberId !== undefined) {
			const res = await listmonkClient.PUT(`/subscribers/{id}`, {
				params: {
					path: { id: subscriberId }
				},
				body: {
					email: state.email,
					name: state.formattedName,
					attribs: attribsForApi(state.attribs),
					lists: listIds,
					preconfirm_subscriptions: true
				}
			});
			if (res.error) {
				result.updateFailed++;
				console.error(
					`  ! Failed to update subscriber ${user.id}: Listmonk API Error\n${errorToString(res)}`
				);
			} else {
				result.updated++;
				console.info(`  - Updated subscriber ${user.id}`);
			}
			classification.updateSubscriberIds.delete(emailKey);
		}
	}

	return result;
}
