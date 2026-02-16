import { listmonkClient } from '../apis/listmonk/listmonkClient';
import { taskWarning } from '../logs';
import type { ListmonkSubscriber } from './types';

const TASK_NAME = 'Mail Service: Sync with Listmonk';
const PER_PAGE = 40;

/**
 * Fetches all subscribers from Listmonk into a Map keyed by lowercase email.
 * Uses direct Map insertion instead of array spread to avoid O(n²) memory allocation.
 */
export async function fetchSubscriberMap(): Promise<Map<string, ListmonkSubscriber>> {
	const subscriberMap = new Map<string, ListmonkSubscriber>();
	let currentPage = 1;
	let totalEntries = 0;

	do {
		const res = await listmonkClient.GET('/subscribers', {
			params: {
				query: {
					per_page: PER_PAGE,
					page: currentPage
				}
			}
		});

		if (res.error || !res.data.data || !res.data.data.results || !res.data.data.total) {
			taskWarning(TASK_NAME, `Failed to fetch subscribers from Listmonk`);
			return new Map();
		}

		for (const subscriber of res.data.data.results) {
			// TYPE-SAFETY-EXCEPTION: openapi-fetch generates optional fields for Listmonk API responses,
			// but the API guarantees these fields are present when the request succeeds
			const s = subscriber as unknown as ListmonkSubscriber;
			subscriberMap.set(s.email.toLowerCase().trim(), s);
		}

		totalEntries = res.data.data.total;
		const totalPages = Math.ceil(totalEntries / PER_PAGE);
		console.info(
			`  Fetched page ${currentPage}/${totalPages} (${subscriberMap.size}/${totalEntries} subscribers)`
		);
		currentPage++;
	} while ((currentPage - 1) * PER_PAGE < totalEntries);

	return subscriberMap;
}
