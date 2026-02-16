import { listmonkClient } from '../apis/listmonk/listmonkClient';
import deepEquals from '../helper/deepEquals';
import { computeSubscriberState } from './listRules';
import type {
	MailSyncUser,
	ListmonkSubscriber,
	ComputedSubscriberState,
	SubscriberAttribs,
	SyncDiff
} from './types';

// TYPE-SAFETY-EXCEPTION: openapi-fetch generates `Record<string, unknown>` for attribs,
// but we use a strongly-typed SubscriberAttribs interface internally. This helper bridges
// the boundary to the Listmonk API.
function attribsForApi(attribs: SubscriberAttribs): Record<string, unknown> {
	return attribs as unknown as Record<string, unknown>;
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
 * Classifies a batch of users against the subscriber Map in a single pass.
 * - Users without a matching subscriber → toCreate
 * - Users with a non-matching subscriber → toUpdate (subscriber removed from Map)
 * - Users with a matching subscriber → no action (subscriber removed from Map)
 * - Users with zero computed lists → skipped (subscriber stays in Map for deletion)
 */
export function classifyUserBatch(
	users: MailSyncUser[],
	subscriberMap: Map<string, ListmonkSubscriber>,
	diff: SyncDiff
): void {
	for (const user of users) {
		const state = computeSubscriberState(user);

		if (state.listNames.length === 0) {
			diff.skippedNoLists++;
			continue;
		}

		const emailKey = user.email.toLowerCase().trim();
		const subscriber = subscriberMap.get(emailKey);

		if (!subscriber) {
			diff.toCreate.push({ user, state });
		} else if (!subscriberMatchesState(subscriber, state)) {
			diff.toUpdate.push({ subscriber, state });
			subscriberMap.delete(emailKey);
		} else {
			diff.upToDate++;
			subscriberMap.delete(emailKey);
		}
	}
}

/**
 * After all user batches have been processed, any remaining subscribers in the Map
 * are orphans that should be deleted.
 */
export function collectDeletes(
	subscriberMap: Map<string, ListmonkSubscriber>,
	diff: SyncDiff
): void {
	for (const subscriber of subscriberMap.values()) {
		diff.toDelete.push(subscriber);
	}
}

/**
 * Executes create operations against the Listmonk API.
 */
export async function executeCreates(
	diff: SyncDiff,
	listNameToId: Map<string, number>
): Promise<void> {
	if (diff.toCreate.length === 0) return;

	const total = diff.toCreate.length;
	let succeeded = 0;
	let failed = 0;

	console.info(`\nExecuting Create operations: 0/${total}`);
	for (const { user, state } of diff.toCreate) {
		const listIds = state.listNames
			.map((name) => listNameToId.get(name))
			.filter((id): id is number => id !== undefined);

		const res = await listmonkClient.POST('/subscribers', {
			body: {
				email: state.email,
				name: state.formattedName,
				attribs: attribsForApi(state.attribs),
				lists: listIds
			}
		});
		if (res.error) {
			failed++;
			console.error(
				`  ! Failed to create subscriber for user ${user.id}: Listmonk API Error\n${JSON.stringify((res as Record<string, unknown>).error, null, 2)}`
			);
		} else {
			succeeded++;
			console.info(`  - Created subscriber for user ${user.id} [${succeeded + failed}/${total}]`);
		}
	}
	console.info(`Create operations finished: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Executes update operations against the Listmonk API.
 */
export async function executeUpdates(
	diff: SyncDiff,
	listNameToId: Map<string, number>
): Promise<void> {
	if (diff.toUpdate.length === 0) return;

	const total = diff.toUpdate.length;
	let succeeded = 0;
	let failed = 0;

	console.info(`\nExecuting Update operations: 0/${total}`);
	for (const { subscriber, state } of diff.toUpdate) {
		const listIds = state.listNames
			.map((name) => listNameToId.get(name))
			.filter((id): id is number => id !== undefined);

		const res = await listmonkClient.PUT(`/subscribers/{id}`, {
			params: {
				path: {
					id: subscriber.id
				}
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
			failed++;
			console.error(
				`  ! Failed to update subscriber ${subscriber.attribs.userId}: Listmonk API Error\n${JSON.stringify((res as Record<string, unknown>).error, null, 2)}`
			);
		} else {
			succeeded++;
			console.info(
				`  - Updated subscriber ${subscriber.attribs.userId} [${succeeded + failed}/${total}]`
			);
		}
	}
	console.info(`Update operations finished: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Executes delete operations against the Listmonk API.
 */
export async function executeDeletes(diff: SyncDiff): Promise<void> {
	if (diff.toDelete.length === 0) return;

	const total = diff.toDelete.length;
	let succeeded = 0;
	let failed = 0;

	console.info(`\nExecuting Delete operations: 0/${total}`);
	for (const subscriber of diff.toDelete) {
		const res = await listmonkClient.DELETE(`/subscribers/{id}`, {
			params: {
				path: {
					id: subscriber.id
				}
			}
		});
		if (res.error) {
			failed++;
			console.error(
				`  ! Failed to delete subscriber ${subscriber.attribs.userId}: Listmonk API Error\n${JSON.stringify((res as Record<string, unknown>).error, null, 2)}`
			);
		} else {
			succeeded++;
			console.info(
				`  - Deleted subscriber ${subscriber.attribs.userId} [${succeeded + failed}/${total}]`
			);
		}
	}
	console.info(`Delete operations finished: ${succeeded} succeeded, ${failed} failed`);
}
