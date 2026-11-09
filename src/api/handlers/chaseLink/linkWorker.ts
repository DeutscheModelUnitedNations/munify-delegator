import { db, schema } from '#api/db/db';
import { eq } from 'drizzle-orm';
import { chasePresencePubsub, instanceLinkPubsub } from '#api/pubsub';
import { logger } from '#lib/logger';
import { createChaseClient, type ChaseClient } from './chaseRemote';
import { openLinkToken } from './linkTokens';
import { presenceFromChase } from './presenceMirror';
import { syncResolutions } from './resolutionSync';
import { readAll } from './readAll';

/**
 * The link worker (`docs/plans/chase-link.md`): reads back what the linked CHASE records about this
 * instance's conferences - their presence and the resolutions they adopted. It runs in one app
 * process at a time (a Postgres advisory lock), subscribes to CHASE's live queries, and on any
 * change reads that part of the conference afresh: the presence into `chase_presence`, the
 * adopted resolutions into `resolution` (`resolutionSync.ts`). The WebSocket's (re)connect reads everything
 * again, since updates may have been missed while it was down. There is no timer: a dead socket is
 * noticed by graphql-ws's keep-alive, and the reconnect catches up.
 */

/** pg advisory lock key for the worker, any constant no other lock uses. */
const LEADER_LOCK_KEY = 4_812_772;
/** A roll call writes a record per delegate; one read after it is enough. */
const DEBOUNCE_MS = 1_000;

/** What the worker reads back, each on its own schedule: a presence change never compiles a PDF. */
type Readback = 'presence' | 'resolutions';
const READBACKS: Readback[] = ['presence', 'resolutions'];

let running: { stop: () => void } | undefined;

export function startLinkWorker() {
	running ??= runWorker();
}

export function stopLinkWorker() {
	running?.stop();
	running = undefined;
}

/** On server start: picks the link up again when this instance is linked. */
export async function resumeLinkWorker() {
	const link = await db.query.instanceLink.findFirst({
		where: { status: 'ACTIVE' },
		columns: { id: true }
	});
	if (link) startLinkWorker();
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

		const link = await db.query.instanceLink.findFirst({ where: { status: 'ACTIVE' } });
		if (!link?.outboundToken) return stop();

		const watchers = new Map<string, () => void>();
		const timers = new Map<string, ReturnType<typeof setTimeout>>();
		/** Resolution syncs run one after another: each may compile PDFs. */
		let resolutionQueue = Promise.resolve();
		cleanups.push(() => {
			for (const timer of timers.values()) clearTimeout(timer);
			for (const unwatch of watchers.values()) unwatch();
		});

		const read = ({ readback, conferenceId }: { readback: Readback; conferenceId: string }) => {
			if (readback === 'presence') {
				return recorded({ linkId: link.id, conferenceId, what: 'presence' }, () =>
					readPresence({ remote, conferenceId })
				);
			}
			resolutionQueue = resolutionQueue.then(() =>
				stopped
					? undefined
					: recorded({ linkId: link.id, conferenceId, what: 'resolutions' }, () =>
							syncResolutions({ remote, conferenceId })
						)
			);
			return resolutionQueue;
		};

		const schedule = ({ readback, conferenceId }: { readback: Readback; conferenceId: string }) => {
			const key = `${readback}:${conferenceId}`;
			clearTimeout(timers.get(key));
			timers.set(
				key,
				setTimeout(() => {
					timers.delete(key);
					if (!stopped) void read({ readback, conferenceId });
				}, DEBOUNCE_MS)
			);
		};
		const scheduleAll = (conferenceId: string) => {
			for (const readback of READBACKS) schedule({ readback, conferenceId });
		};

		let reconnected = () => {};
		const remote: ChaseClient = createChaseClient({
			url: link.remoteUrl,
			token: openLinkToken(link.outboundToken),
			onConnected: () => {
				reconnected();
				for (const conferenceId of watchers.keys()) scheduleAll(conferenceId);
			}
		});
		cleanups.push(() => remote.dispose());

		// A live query's first answer may fail (CHASE unreachable, a rule refusing): that is noted on
		// the link and retried on the next (re)connect, never left to crash the app.
		const failed = (error: unknown) => {
			logger.warn('A live query to CHASE failed', error);
			void noteError({ linkId: link.id, error });
		};

		// CHASE lets the link read back only the conferences that came from here
		// Set up again on every (re)connect: a first answer that failed (the other side was away)
		// leaves no watch behind otherwise.
		let unwatchConferences: (() => void) | undefined;
		const watchConferences = () => {
			unwatchConferences?.();
			const conferences = handled(remote.liveQuery.conferences({ id: true }), failed);
			unwatchConferences = conferences.subscribe((list) => {
				if (!list || stopped) return;
				const current = new Set(list.map((conference) => conference.id));
				for (const [conferenceId, unwatch] of watchers) {
					if (current.has(conferenceId)) continue;
					unwatch();
					watchers.delete(conferenceId);
				}
				for (const conferenceId of current) {
					if (watchers.has(conferenceId)) continue;
					const events = handled(
						remote.liveQuery.presenceEvents({
							__args: { where: { committee: { conferenceId: { eq: conferenceId } } } },
							id: true,
							present: true
						}),
						failed
					);
					// A concluded vote adds a snapshot; the outcome is set on the vote, which the nested
					// selection listens on too.
					const adoptions = handled(
						remote.liveQuery.paperContentSnapshots({
							__args: {
								where: {
									trigger: 'VOTE_CONCLUDED',
									paper: { committee: { conferenceId: { eq: conferenceId } } }
								}
							},
							id: true,
							paper: { id: true, vote: { id: true, outcome: true } }
						}),
						failed
					);
					const unwatchEvents = events.subscribe(() =>
						schedule({ readback: 'presence', conferenceId })
					);
					const unwatchAdoptions = adoptions.subscribe(() =>
						schedule({ readback: 'resolutions', conferenceId })
					);
					watchers.set(conferenceId, () => {
						unwatchEvents();
						unwatchAdoptions();
					});
					scheduleAll(conferenceId);
				}
			});
		};
		reconnected = watchConferences;
		watchConferences();
		cleanups.push(() => unwatchConferences?.());
	})().catch((error) => {
		logger.error('The CHASE link worker stopped', error);
		stop();
		running = undefined;
	});

	return { stop };
}

/** Lets a live query's first answer fail without an unhandled rejection; it still subscribes. */
function handled<T extends PromiseLike<unknown>>(result: T, onError: (error: unknown) => void): T {
	Promise.resolve(result).then(undefined, onError);
	return result;
}

/** Notes a failure on the link, for the pairing page. */
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
	{ linkId, conferenceId, what }: { linkId: string; conferenceId: string; what: Readback },
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
		logger.warn('Reading back from CHASE failed', { error, conferenceId, what });
		await noteError({ linkId, error });
	}
}

/** Reads one conference's presence from CHASE as it is now and stores it. */
async function readPresence({
	remote,
	conferenceId
}: {
	remote: ChaseClient;
	conferenceId: string;
}) {
	const representation = {
		id: true,
		type: true,
		alpha2Code: true,
		alpha3Code: true,
		faIcon: true,
		name: true
	} as const;
	const users = await readAll((page) =>
		remote.query.conferenceUsers({
			__args: {
				...page,
				where: { conferenceId: { eq: conferenceId } }
			},
			conferenceUserType: true,
			userEmail: true,
			committeeMember: { committeeId: true, representation },
			conferenceMember: { representation },
			presenceEvents: { id: true, committeeId: true, present: true, type: true, timestamp: true }
		})
	);
	const now = new Date();
	const data = presenceFromChase({ conferenceId, users: Array.from(users), now });

	await db
		.insert(schema.chasePresence)
		.values({ conferenceId, data, fetchedAt: now })
		.onConflictDoUpdate({
			target: schema.chasePresence.conferenceId,
			set: { data, fetchedAt: now, updatedAt: now }
		});
	chasePresencePubsub.created();
	chasePresencePubsub.updated(conferenceId);
}
