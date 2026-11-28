import { afterEach, describe, expect, test, vi } from 'vitest';
import { createWakeLock } from './wakeLock';

/** A screen wake lock the browser hands out; `release` lets go of the last one, as the browser does. */
function fakeWakeLock() {
	const sentinels: { release: () => Promise<void>; let: () => void }[] = [];
	const request = vi.fn(async () => {
		const target = new EventTarget();
		const sentinel = Object.assign(target, {
			release: vi.fn(async () => undefined),
			let: () => target.dispatchEvent(new Event('release'))
		});
		sentinels.push(sentinel);
		return sentinel;
	});
	vi.stubGlobal('navigator', { wakeLock: { request } });
	return { request, sentinels };
}

const settle = () => new Promise((later) => setTimeout(later, 0));

afterEach(() => vi.unstubAllGlobals());

describe('createWakeLock', () => {
	test('keeps the screen on while held, and lets go when released', async () => {
		const { request, sentinels } = fakeWakeLock();
		const lock = createWakeLock();
		lock.hold();
		await settle();
		expect(request).toHaveBeenCalledWith('screen');
		lock.release();
		expect(sentinels[0].release).toHaveBeenCalled();
	});

	test('takes it again once the page is shown after the browser let go', async () => {
		const { request, sentinels } = fakeWakeLock();
		const lock = createWakeLock();
		lock.hold();
		await settle();
		sentinels[0].let();
		document.dispatchEvent(new Event('visibilitychange'));
		await settle();
		expect(request).toHaveBeenCalledTimes(2);
		lock.release();
	});

	test('does nothing where the browser cannot', () => {
		vi.stubGlobal('navigator', {});
		const lock = createWakeLock();
		expect(() => lock.hold()).not.toThrow();
		lock.release();
	});
});
