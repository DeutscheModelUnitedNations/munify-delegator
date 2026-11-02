import { db, schema } from '#api/db/db';
import { eq } from 'drizzle-orm';
import { chasePresencePubsub, instanceLinkPubsub } from '#api/pubsub';
import { logger } from '#lib/logger';
import { createChaseClient, type ChaseClient } from './chaseRemote';
import { openLinkToken } from './linkTokens';
import { presenceFromChase } from './presenceMirror';

/**
 * The link worker (`docs/plans/chase-link.md`): reads back what the linked CHASE records about this
 * instance's conferences - their presence. It runs in one app process at a time (a Postgres
 * advisory lock), subscribes to CHASE's live queries, and on any change reads the conference's
 * presence afresh and stores it (`chase_presence`). The WebSocket's (re)connect reads everything
 * again, since updates may have been missed while it was down. There is no timer: a dead socket is
 * noticed by graphql-ws's keep-alive, and the reconnect catches up.
 */

/** pg advisory lock key for the worker, any constant no other lock uses. */
const LEADER_LOCK_KEY = 4_812_772;
/** A roll call writes a record per delegate; one read after it is enough. */
const DEBOUNCE_MS = 1_000;

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
		cleanups.push(() => {
			for (const timer of timers.values()) clearTimeout(timer);
			for (const unwatch of watchers.values()) unwatch();
		});

		const schedule = (conferenceId: string) => {
			clearTimeout(timers.get(conferenceId));
			timers.set(
				conferenceId,
				setTimeout(() => {
					timers.delete(conferenceId);
					if (!stopped) void readPresence({ remote, linkId: link.id, conferenceId });
				}, DEBOUNCE_MS)
			);
		};

		const remote: ChaseClient = createChaseClient({
			url: link.remoteUrl,
			token: openLinkToken(link.outboundToken),
			onConnected: () => {
				for (const conferenceId of watchers.keys()) schedule(conferenceId);
			}
		});
		cleanups.push(() => remote.dispose());

		// CHASE lets the link read back only the conferences that came from here
		const conferences = remote.liveQuery.conferences({ id: true });
		const unsubscribe = conferences.subscribe((list) => {
			if (!list || stopped) return;
			const current = new Set(list.map((conference) => conference.id));
			for (const [conferenceId, unwatch] of watchers) {
				if (current.has(conferenceId)) continue;
				unwatch();
				watchers.delete(conferenceId);
			}
			for (const conferenceId of current) {
				if (watchers.has(conferenceId)) continue;
				const events = remote.liveQuery.presenceEvents({
					__args: { where: { committee: { conferenceId: { eq: conferenceId } } } },
					id: true,
					present: true
				});
				watchers.set(
					conferenceId,
					events.subscribe(() => schedule(conferenceId))
				);
				schedule(conferenceId);
			}
		});
		cleanups.push(unsubscribe);
	})().catch((error) => {
		logger.error('The CHASE link worker stopped', error);
		stop();
		running = undefined;
	});

	return { stop };
}

/** Reads one conference's presence from CHASE as it is now and stores it. */
async function readPresence({
	remote,
	linkId,
	conferenceId
}: {
	remote: ChaseClient;
	linkId: string;
	conferenceId: string;
}) {
	try {
		const representation = {
			id: true,
			type: true,
			alpha2Code: true,
			alpha3Code: true,
			faIcon: true,
			name: true
		} as const;
		const users = await remote.query.conferenceUsers({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			conferenceUserType: true,
			userEmail: true,
			committeeMember: { committeeId: true, representation },
			conferenceMember: { representation },
			presenceEvents: { id: true, committeeId: true, present: true, type: true, timestamp: true }
		});
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

		await db
			.update(schema.instanceLink)
			.set({ lastEventAt: now, lastReconcileAt: now, lastError: null })
			.where(eq(schema.instanceLink.id, linkId));
		instanceLinkPubsub.updated(linkId);
	} catch (error) {
		logger.warn('Reading the presence from CHASE failed', { error, conferenceId });
		await db
			.update(schema.instanceLink)
			.set({ lastError: error instanceof Error ? error.message : String(error) })
			.where(eq(schema.instanceLink.id, linkId))
			.catch(() => undefined);
		instanceLinkPubsub.updated(linkId);
	}
}
