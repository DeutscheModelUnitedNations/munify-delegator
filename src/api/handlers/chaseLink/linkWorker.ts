import { db, schema } from '#api/db/db';
import { eq } from 'drizzle-orm';
import { instanceLinkPubsub } from '#api/pubsub';
import { logger } from '#lib/logger';
import { createChaseClient, type ChaseClient } from './chaseRemote';
import { watchChaseTables, type ChaseTables } from './chaseTables';
import { linkAccessToken, linkConfig } from './linkAuth';
import { syncLinkRow } from './chaseLinkService';
import { createGate, handled } from './liveTable';
import { syncResolutions } from './resolutionSync';

/**
 * The link worker (`docs/plans/chase-link.md`): reads back what the linked CHASE records about this
 * instance's conferences - the resolutions they adopted (presence is asked for when needed,
 * `fetchChasePresence`). It runs in one app process at a time (a Postgres advisory lock) and keeps
 * CHASE's tables of each conference in memory through live queries (`chaseTables.ts`): a change
 * answers with the rows of the table it touched, and the adopted resolutions (`resolution`,
 * `resolutionSync.ts`) are worked out from memory. The WebSocket's (re)connect asks every table
 * again, since updates may have been missed while it was down. There is no timer: a dead socket is
 * noticed by graphql-ws's keep-alive, and the reconnect catches up.
 */

/** pg advisory lock key for the worker, any constant no other lock uses. */
const LEADER_LOCK_KEY = 4_812_772;
/** A vote's conclusion touches the paper and its snapshot; one sync after both is enough. */
const DEBOUNCE_MS = 1_000;
/** First answers awaited at once, so starting up does not ask CHASE for everything at once. */
const FIRST_ANSWERS_AT_ONCE = 4;

let running: { stop: () => void } | undefined;

export function startLinkWorker() {
	running ??= runWorker();
}

export function stopLinkWorker() {
	running?.stop();
	running = undefined;
}

/** On server start: brings the link's row in line with the configuration and starts reading. */
export async function resumeLinkWorker() {
	if (await syncLinkRow()) startLinkWorker();
}

function runWorker() {
	let stopped = false;
	const cleanups: (() => void)[] = [];
	const stop = () => {
		stopped = true;
		for (const cleanup of cleanups.splice(0).reverse()) cleanup();
	};

	(async () => {
		// a string under `drizzle.mock()`, which only `vite build` uses
		if (typeof db.$client === 'string') return;
		const leadership = await db.$client.connect();
		cleanups.push(() => {
			void leadership
				.query('select pg_advisory_unlock($1)', [LEADER_LOCK_KEY])
				.finally(() => leadership.release());
		});
		// waits for the instance holding the worker to stop or die
		await leadership.query('select pg_advisory_lock($1)', [LEADER_LOCK_KEY]);
		if (stopped) return;

		const config = linkConfig();
		const link = await db.query.instanceLink.findFirst({ columns: { id: true } });
		if (!config || !link) return stop();

		const watches = new Map<string, ChaseTables>();
		const timers = new Map<string, ReturnType<typeof setTimeout>>();
		/** Resolution syncs run one after another: each may compile PDFs. */
		let resolutionQueue = Promise.resolve();
		cleanups.push(() => {
			for (const timer of timers.values()) clearTimeout(timer);
			for (const tables of watches.values()) tables.stop();
		});

		const read = (conferenceId: string) => {
			const tables = watches.get(conferenceId);
			if (!tables) return;
			resolutionQueue = resolutionQueue.then(() => {
				// read when its turn comes: the tables may have changed while it waited
				if (stopped || !tables.resolutionsReady()) return;
				const papers = tables.papers();
				return recorded({ linkId: link.id, conferenceId }, () =>
					syncResolutions({ remote, conferenceId, papers })
				);
			});
			return resolutionQueue;
		};

		const schedule = (conferenceId: string) => {
			clearTimeout(timers.get(conferenceId));
			timers.set(
				conferenceId,
				setTimeout(() => {
					timers.delete(conferenceId);
					if (!stopped) void read(conferenceId);
				}, DEBOUNCE_MS)
			);
		};

		// A live query's answer may fail (CHASE unreachable, a rule refusing): that is noted on the
		// link, never left to crash the app. A first answer is asked again, an update waits for the next.
		const failed = (error: unknown) => {
			logger.warn('A live query to CHASE failed', error);
			void noteError({ linkId: link.id, error });
		};

		let reconnected = () => {};
		const remote: ChaseClient = createChaseClient({
			url: config.remoteUrl,
			token: () => linkAccessToken(config),
			onError: failed,
			onConnected: () => reconnected()
		});
		cleanups.push(() => remote.dispose());

		// CHASE lets the link read back only the conferences that came from here. Set up again on
		// every (re)connect: a first answer that failed (the other side was away) leaves no watch
		// behind otherwise.
		const gate = createGate(FIRST_ANSWERS_AT_ONCE);
		let unwatchConferences: (() => void) | undefined;
		const watchConferences = () => {
			unwatchConferences?.();
			const conferences = handled(remote.liveQuery.conferences({ id: true }), failed);
			unwatchConferences = conferences.subscribe((list) => {
				if (!list || stopped) return;
				const current = new Set(Array.from(list).map((conference) => conference.id));
				for (const [conferenceId, tables] of watches) {
					if (current.has(conferenceId)) continue;
					tables.stop();
					watches.delete(conferenceId);
				}
				for (const conferenceId of current) {
					if (watches.has(conferenceId)) continue;
					watches.set(
						conferenceId,
						watchChaseTables({
							remote,
							conferenceId,
							onResolutions: () => schedule(conferenceId),
							onError: failed,
							gate
						})
					);
				}
			});
		};
		// A socket that broke may have taken its subscriptions along, so every table is asked again
		reconnected = () => {
			for (const tables of watches.values()) tables.refresh();
			watchConferences();
		};
		watchConferences();
		cleanups.push(() => unwatchConferences?.());
	})().catch((error) => {
		logger.error('The CHASE link worker stopped', error);
		stop();
		running = undefined;
	});

	return { stop };
}

/** Notes a failure on the link, for the link page. */
async function noteError({ linkId, error }: { linkId: string; error: unknown }) {
	await db
		.update(schema.instanceLink)
		.set({ lastError: error instanceof Error ? error.message : String(error) })
		.where(eq(schema.instanceLink.id, linkId))
		.catch(() => undefined);
	instanceLinkPubsub.updated(linkId);
}

/**
 * Runs one read-back and notes on the link how it went: when it last succeeded, or why it failed.
 * A failure is logged and kept for the link page; the next change or reconnect tries again.
 */
async function recorded(
	{ linkId, conferenceId }: { linkId: string; conferenceId: string },
	readback: () => Promise<unknown>
) {
	try {
		await readback();
		const now = new Date();
		await db
			.update(schema.instanceLink)
			.set({ lastEventAt: now, lastReconcileAt: now, lastError: null })
			.where(eq(schema.instanceLink.id, linkId));
		instanceLinkPubsub.updated(linkId);
	} catch (error) {
		logger.warn('Reading back from CHASE failed', { error, conferenceId });
		await noteError({ linkId, error });
	}
}
