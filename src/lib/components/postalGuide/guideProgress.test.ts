import { describe, expect, test } from 'vitest';
import { createGuideProgress, type GuideProgress } from './guideProgress.svelte.js';

/** Watches `ms` of the guide, frame by frame. */
function watch({ progress, ms }: { progress: GuideProgress; ms: number }) {
	for (let left = ms; left > 0; left -= 20) progress.tick(Math.min(left, 20));
}

describe('createGuideProgress', () => {
	test('a step opens the next only once it was watched for its time', () => {
		const progress = createGuideProgress({ durations: [1000, 500] });
		progress.next();
		expect(progress.index).toBe(0);

		watch({ progress, ms: 400 });
		expect(progress.ready).toBe(false);
		expect(progress.fill(0)).toBeCloseTo(0.4);
		expect(progress.fill(1)).toBe(0);

		watch({ progress, ms: 600 });
		expect(progress.ready).toBe(true);
		expect(progress.fill(0)).toBe(1);

		progress.next();
		expect(progress.index).toBe(1);
		expect(progress.ready).toBe(false);
		expect(progress.fill(0)).toBe(1);
		expect(progress.fill(1)).toBe(0);
	});

	test('is done past the last step, where time no longer counts', () => {
		const progress = createGuideProgress({ durations: [100] });
		watch({ progress, ms: 100 });
		expect(progress.done).toBe(false);
		progress.next();
		expect(progress.done).toBe(true);
		watch({ progress, ms: 1000 });
		progress.next();
		expect(progress.index).toBe(1);
		expect(progress.fill(0)).toBe(1);
	});

	test('a watched step stays open, and an interrupted one starts over', () => {
		const progress = createGuideProgress({ durations: [100, 1000] });
		watch({ progress, ms: 100 });
		progress.next();
		watch({ progress, ms: 400 });

		progress.back();
		expect(progress.index).toBe(0);
		expect(progress.ready).toBe(true);
		expect(progress.fill(1)).toBe(0);

		progress.next();
		expect(progress.ready).toBe(false);
		expect(progress.fill(1)).toBe(0);
	});

	test('there is nothing before the first step', () => {
		const progress = createGuideProgress({ durations: [100] });
		progress.back();
		expect(progress.index).toBe(0);
	});

	test('time in a background tab does not count', () => {
		const progress = createGuideProgress({ durations: [1000] });
		progress.tick(60_000);
		expect(progress.fill(0)).toBeCloseTo(0.1);
	});

	test('watched to its end before, no step waits', () => {
		const progress = createGuideProgress({ durations: [1000, 1000], skippable: true });
		expect(progress.ready).toBe(true);
		expect(progress.fill(1)).toBe(0);
		progress.next();
		progress.next();
		expect(progress.done).toBe(true);
	});
});
