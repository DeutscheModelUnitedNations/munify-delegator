import { listmonkClient } from '../apis/listmonk/listmonkClient';
import { taskWarning } from '../logs';
import type { ListmonkSubscriber } from './types';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

/**
 * Fetches every subscriber on one of our lists into a Map keyed by lowercase email, in a single
 * request.
 *
 * Subscribers only on lists of other systems (the DMUN member hub) are left out: there is nothing
 * of ours to compare or release on them. A user whose address is such a subscriber is planned as
 * a create, which fails on the duplicate address and then joins the existing subscriber
 * (`subscriberActions.ts`). One request instead of pages also means the other system's cleanup
 * cannot shift the pages under us mid-fetch.
 *
 * Returns `undefined` if the fetch fails. An incomplete map must not be planned against: every
 * subscriber missing from it would look like a user without a subscriber.
 */
export async function fetchSubscriberMap(
	listIds: number[]
): Promise<Map<string, ListmonkSubscriber> | undefined> {
	const subscriberMap = new Map<string, ListmonkSubscriber>();
	if (listIds.length === 0) return subscriberMap;

	const res = await listmonkClient.GET('/subscribers', {
		params: { query: { list_id: listIds, per_page: 'all' } }
	});

	if (res.error || !res.data.data || !res.data.data.results) {
		taskWarning({ taskName: TASK_NAME, message: `Failed to fetch subscribers from Listmonk` });
		return undefined;
	}

	for (const subscriber of res.data.data.results) {
		// TYPE-SAFETY-EXCEPTION: openapi-fetch generates optional fields for Listmonk API responses,
		// but the API guarantees these fields are present when the request succeeds
		const s = subscriber as unknown as ListmonkSubscriber;
		subscriberMap.set(s.email.toLowerCase().trim(), s);
	}

	return subscriberMap;
}
