/** More than a frame passed at once: the tab was in the background, where nobody watched. */
const LONGEST_FRAME_MS = 100;

/**
 * How far somebody is in the postal guide: one step after the other, each to be watched for its time
 * before the next opens. A step watched once stays open, so going back never waits again. Past the
 * last step (`index === durations.length`) the guide is done.
 *
 * With `skippable` (it was watched to its end before) no step waits.
 */
export function createGuideProgress({
	durations,
	skippable = false
}: {
	/** How long each step has to be watched, in milliseconds. */
	durations: readonly number[];
	skippable?: boolean;
}) {
	let index = $state(0);
	/** The first step not watched to its end yet. */
	let unwatched = $state(skippable ? durations.length : 0);
	let elapsed = $state(0);

	const isReady = () => index < unwatched;

	return {
		get index() {
			return index;
		},
		/** Whether the next step may be opened. */
		get ready() {
			return isReady();
		},
		get done() {
			return index === durations.length;
		},
		/** How much of the step's segment in the progress bar is filled, from 0 to 1. */
		fill(step: number) {
			if (step !== index) return step < index ? 1 : 0;
			return isReady() ? 1 : elapsed / durations[step];
		},
		/** Counts the time `delta` (milliseconds) since the last frame as watched. */
		tick(delta: number) {
			if (index === durations.length || isReady()) return;
			elapsed += Math.min(delta, LONGEST_FRAME_MS);
			if (elapsed < durations[index]) return;
			unwatched = index + 1;
			elapsed = 0;
		},
		next() {
			if (isReady()) index += 1;
		},
		back() {
			if (index > 0) index -= 1;
			elapsed = 0;
		},
		/** The step was interrupted and plays from its start. */
		restartStep() {
			elapsed = 0;
		}
	};
}

export type GuideProgress = ReturnType<typeof createGuideProgress>;
