import { logger } from '#lib/logger';

/**
 * Keeps the screen on while held (Screen Wake Lock), for a phone laid over the pages that nobody
 * touches. The browser lets go of it whenever the page is hidden, so it is taken again once the page
 * is shown again. A browser without it lets the screen go dark as it likes.
 */
export function createWakeLock() {
	let held = false;
	let sentinel: WakeLockSentinel | undefined;

	/** Whether the screen can be kept on now: wanted, not yet, by a browser that can, shown. */
	const canTake = () =>
		held &&
		!sentinel &&
		typeof navigator !== 'undefined' &&
		'wakeLock' in navigator &&
		document.visibilityState === 'visible';

	async function take() {
		if (!canTake()) return;
		try {
			const taken = await navigator.wakeLock.request('screen');
			taken.addEventListener('release', () => {
				if (sentinel === taken) sentinel = undefined;
			});
			if (held) sentinel = taken;
			else void taken.release();
		} catch (error) {
			logger.warn('Keeping the screen on failed', error);
		}
	}

	const onVisible = () => void take();

	return {
		hold() {
			if (held) return;
			held = true;
			document.addEventListener('visibilitychange', onVisible);
			void take();
		},
		release() {
			held = false;
			document.removeEventListener('visibilitychange', onVisible);
			void sentinel?.release();
			sentinel = undefined;
		}
	};
}
