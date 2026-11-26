import { logger } from '#lib/logger';
import {
	claimTask,
	postponeTask,
	releaseTask,
	renewHold,
	type ScanTask,
	type TaskKind
} from './scanTaskService';

/** Then a task is given up. */
const MAX_ATTEMPTS = 5;
/** How long until the next attempt: 2, 4, 8 and 16 minutes. */
const delayAfter = (attempts: number) => 2 ** attempts * 60_000;
const RENEW_MS = 60_000;

/** Renews the hold on a task while it is worked on; answers how to stop. */
function keepHolding(task: ScanTask) {
	const timer = setInterval(() => {
		renewHold(task).catch((error: unknown) =>
			logger.warn('Renewing the hold on a delivered scan failed', error)
		);
	}, RENEW_MS);
	timer.unref();
	return () => clearInterval(timer);
}

/**
 * Works through tasks of some kinds in this process, `parallel` at a time, people taking turns. `work` does
 * one; what it throws is tried again later, and `giveUp` ends one that failed too often.
 */
export function createTaskLane({
	kinds,
	work,
	giveUp,
	isEnding,
	parallel = 1
}: {
	kinds: readonly TaskKind[];
	work: (task: ScanTask) => Promise<void>;
	giveUp: (task: ScanTask) => Promise<void>;
	isEnding: () => boolean;
	parallel?: number;
}) {
	/** When each person's last task was begun, counting up. */
	const lastServed = new Map<string, number>();
	let served = 0;
	/** What is worked on now. */
	const current = new Set<ScanTask>();
	/** How many work through the queue. */
	let running = 0;
	/** Counts up with each wake, so a runner that drained the queue looks again for what came meanwhile. */
	let wakes = 0;

	async function attempt(task: ScanTask) {
		// one that takes its process down is never heard of but by its attempts
		if (task.attempts > MAX_ATTEMPTS) return giveUp(task);
		try {
			await work(task);
		} catch (error) {
			// what the end of the process cut off was let go of
			if (isEnding()) return;
			const { kind, deliveryId, page, attempts } = task;
			logger.warn('Taking in a delivered scan failed', {
				kind,
				deliveryId,
				page,
				attempts,
				error
			});
			if (attempts >= MAX_ATTEMPTS) return giveUp(task);
			await postponeTask({ of: task, delayMs: delayAfter(attempts) });
		}
	}

	/** Lets go of what is worked on, so another process has it at once. */
	async function release() {
		const tasks = [...current];
		current.clear();
		await Promise.all(
			tasks.map((task) =>
				releaseTask({ of: task }).catch((error: unknown) =>
					logger.warn('Letting go of a delivered scan failed', error)
				)
			)
		);
	}

	/** Works until nothing is due. */
	async function drain() {
		while (!isEnding()) {
			const task = await claimTask({ kinds, lastServed });
			if (!task) return;
			lastServed.set(task.userId, ++served);
			current.add(task);
			// the process was told to end while it claimed
			if (isEnding()) return release();
			const stopHolding = keepHolding(task);
			try {
				await attempt(task);
			} finally {
				stopHolding();
				current.delete(task);
			}
		}
	}

	/** One of those working through the queue, until nothing is due. */
	async function runner() {
		running += 1;
		try {
			for (let seen = -1; seen !== wakes && !isEnding();) {
				seen = wakes;
				await drain();
			}
		} catch (error) {
			if (!isEnding()) logger.error('Working through the delivered scans failed', error);
		} finally {
			running -= 1;
		}
	}

	return {
		/** Has the lane work, in the background; what is queued meanwhile is included. */
		wake() {
			wakes += 1;
			while (running < parallel && !isEnding()) void runner();
		},
		release
	};
}
