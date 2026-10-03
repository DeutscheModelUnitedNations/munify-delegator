import { listmonkClient } from '../apis/listmonk/listmonkClient';
import type { PlanExecutionResult, SubscriberAction, SubscriberPatch } from './types';

/**
 * Pass 2 of the sync: carry out the planned actions against the Listmonk API.
 *
 * List memberships only ever change through `PUT /subscribers/lists` (add/remove), never through
 * `PUT /subscribers/{id}`: the latter replaces **all** of a subscriber's lists – even when `lists`
 * is left out – and would drop lists another system added between our read and our write.
 * Name and attribs go through PATCH, which leaves the lists alone and merges attribs key by key.
 */

function errorToString(res: { error?: unknown }): string {
	if (res.error == null) return 'Unknown error';
	return typeof res.error === 'string' ? res.error : JSON.stringify(res.error, null, 2);
}

// TYPE-SAFETY-EXCEPTION: openapi-fetch generates `Record<string, unknown>` for attribs,
// but we use a strongly-typed SubscriberAttribs interface internally. This helper bridges
// the boundary to the Listmonk API.
function attribsForApi(attribs: object): Record<string, unknown> {
	return attribs as unknown as Record<string, unknown>;
}

/** SQL string literal for Listmonk's `query` parameter. */
function sqlString(value: string) {
	return `'${value.replaceAll("'", "''")}'`;
}

async function findSubscriberIdByEmail(email: string): Promise<number | undefined> {
	const res = await listmonkClient.GET('/subscribers', {
		params: {
			query: { query: `LOWER(subscribers.email) = LOWER(${sqlString(email)})`, per_page: 1 }
		}
	});
	return res.data?.data?.results?.[0]?.id;
}

async function changeLists(
	subscriberId: number,
	action: 'add' | 'remove',
	listIds: number[]
): Promise<string | undefined> {
	if (listIds.length === 0) return undefined;
	const res = await listmonkClient.PUT('/subscribers/lists', {
		body: {
			ids: [subscriberId],
			action,
			target_list_ids: listIds,
			...(action === 'add' && { status: 'confirmed' as const })
		}
	});
	return res.error ? `${action} lists: ${errorToString(res)}` : undefined;
}

async function patchSubscriber(
	subscriberId: number,
	patch: SubscriberPatch | undefined
): Promise<string | undefined> {
	if (!patch) return undefined;
	const res = await listmonkClient.PATCH('/subscribers/{id}', {
		params: { path: { id: subscriberId } },
		body: { ...patch, attribs: attribsForApi(patch.attribs) }
	});
	return res.error ? `patch: ${errorToString(res)}` : undefined;
}

async function runUpdate(
	subscriberId: number,
	addListIds: number[],
	removeListIds: number[],
	patch: SubscriberPatch | undefined
): Promise<string[]> {
	const errors = [
		await changeLists(subscriberId, 'add', addListIds),
		await changeLists(subscriberId, 'remove', removeListIds),
		await patchSubscriber(subscriberId, patch)
	];
	return errors.filter((e): e is string => e !== undefined);
}

async function runAction(action: SubscriberAction): Promise<string[]> {
	if (action.kind === 'update') {
		return runUpdate(action.subscriberId, action.addListIds, action.removeListIds, action.patch);
	}

	const res = await listmonkClient.POST('/subscribers', {
		body: {
			email: action.email,
			name: action.name,
			status: 'enabled',
			attribs: attribsForApi(action.attribs),
			lists: action.listIds,
			preconfirm_subscriptions: true
		}
	});
	if (!res.error) return [];

	// Another system may have created the subscriber since we fetched the list. Join it instead of
	// failing; the name stays theirs, like for any subscriber that is on foreign lists.
	const existingId = await findSubscriberIdByEmail(action.email);
	if (existingId === undefined) return [`create: ${errorToString(res)}`];
	return runUpdate(existingId, action.listIds, [], {
		attribs: { userId: action.attribs.userId, conferences: action.attribs.conferences }
	});
}

export async function executeActions(
	label: string,
	actions: SubscriberAction[]
): Promise<PlanExecutionResult> {
	const result: PlanExecutionResult = { succeeded: 0, failed: 0 };
	if (actions.length === 0) return result;

	console.info(`\nExecuting ${label}: 0/${actions.length}`);
	for (const action of actions) {
		const target =
			action.kind === 'create' ? `user ${action.userId}` : `subscriber ${action.subscriberId}`;
		const errors = await runAction(action);
		if (errors.length > 0) {
			result.failed++;
			console.error(
				`  ! Failed to ${action.kind} ${target}: Listmonk API Error\n${errors.join('\n')}`
			);
		} else {
			result.succeeded++;
			console.info(
				`  - ${action.kind === 'create' ? 'Created' : 'Updated'} ${target} [${result.succeeded + result.failed}/${actions.length}]`
			);
		}
	}
	console.info(`${label} finished: ${result.succeeded} succeeded, ${result.failed} failed`);
	return result;
}

/**
 * Deletes every subscriber that is on no list at all – whoever took them off their last list.
 *
 * This is the one step that is not about the delegator's own data, and it does not need to be:
 * a subscriber without any list is of use to nobody, whichever system created it. Running the
 * condition inside Listmonk as a single statement leaves no gap between checking and deleting,
 * so a subscriber another system is adding to a list right now is never caught.
 *
 * Blocklisted subscribers are kept on purpose. They record that an address bounced or asked not
 * to be mailed at all; deleted, the next sync would create them afresh and mail them again.
 */
export const GARBAGE_QUERY =
	"subscribers.status != 'blocklisted' AND NOT EXISTS " +
	'(SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = subscribers.id)';

export async function collectGarbage(): Promise<void> {
	const res = await listmonkClient.POST('/subscribers/query/delete', {
		body: { query: GARBAGE_QUERY }
	});
	if (res.error) {
		console.error(`  ! Failed to delete subscribers without lists: ${errorToString(res)}`);
	} else {
		console.info('  - Deleted subscribers without lists');
	}
}
