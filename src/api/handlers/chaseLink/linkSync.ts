import { instanceSignals } from '#api/rumble';
import { apiError } from '#api/services/errors';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { LINK_TOKEN_HEADER, linkAccessToken, linkConfig } from './linkAuth';

/**
 * "Sync now" for the CHASE link (`docs/plans/chase-link.md`): the link worker reads every table of
 * CHASE again right away, as it does on a reconnect, instead of waiting for the next change. Asked
 * for by a system admin here, or by CHASE (its own "sync now" asks both sides). The worker runs on
 * one instance only (the advisory lock), so the request goes to all of them as an instance signal
 * and the one holding the worker follows it (`followSyncRequests`).
 */

/** Syncs follow each other at least this far apart; requests in between make one more after. */
const SYNC_SPACING_MS = 10_000;
/** How long the other instance may take to accept a request. */
const REMOTE_TIMEOUT_MS = 10_000;

/** Asks the instance running the link worker to read everything again; false while unlinked. */
export function requestLinkSync() {
	if (!linkConfig()) return false;
	instanceSignals.publish('linkSyncRequested', { at: new Date().toISOString() });
	return true;
}

/**
 * Asks the linked CHASE to read everything of this instance again, through its own
 * `requestLinkSync`, which accepts this instance's link token. False while unlinked or when CHASE
 * answers that it has no link; an unreachable or refusing CHASE is a CONFLICT the page shows.
 */
export async function requestRemoteLinkSync() {
	const config = linkConfig();
	if (!config) return false;
	try {
		const response = await fetch(new URL('/api/graphql', config.remoteUrl), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json',
				[LINK_TOKEN_HEADER]: await linkAccessToken(config)
			},
			body: JSON.stringify({ query: 'mutation RequestLinkSync { requestLinkSync }' }),
			signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS)
		});
		return acceptedByRemote(await response.json());
	} catch (error) {
		logger.warn('Asking CHASE to sync failed', error);
		throw apiError({ code: 'CONFLICT', message: m.chaseLinkSyncRemoteFailed() });
	}
}

/** What the other instance answered to `requestLinkSync`; its errors are thrown. */
function acceptedByRemote(body: unknown) {
	const { data, errors } = (body ?? {}) as {
		data?: { requestLinkSync?: unknown } | null;
		errors?: { message?: string }[];
	};
	if (errors?.length) throw new Error(errors.map((error) => error.message).join(' '));
	if (typeof data?.requestLinkSync !== 'boolean') throw new Error('CHASE answered no result');
	return data.requestLinkSync;
}

/**
 * Runs `sync` for each request the worker hears, at most once per `spacingMs`: a request inside
 * that time (a burst of clicks, CHASE asking back) makes one more sync once it has passed. Answers
 * the function that stops following.
 */
export function followSyncRequests({
	requests,
	sync,
	spacingMs = SYNC_SPACING_MS
}: {
	requests: AsyncIterableIterator<unknown>;
	sync: () => void;
	spacingMs?: number;
}) {
	let lastSyncAt = -Infinity;
	let pending: ReturnType<typeof setTimeout> | undefined;
	const run = () => {
		pending = undefined;
		lastSyncAt = Date.now();
		sync();
	};
	const requested = () => {
		if (pending) return;
		const wait = lastSyncAt + spacingMs - Date.now();
		if (wait <= 0) run();
		else pending = setTimeout(run, wait);
	};

	void (async () => {
		for await (const _request of requests) requested();
	})().catch((error) => logger.warn('Following CHASE sync requests stopped', error));

	return () => {
		clearTimeout(pending);
		void requests.return?.();
	};
}
