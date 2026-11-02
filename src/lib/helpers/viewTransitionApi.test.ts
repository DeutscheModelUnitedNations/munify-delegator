import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { onNavigate as onNavigateType } from '$app/navigation';

/** The callback's argument, as SvelteKit types it (the type itself is not exported) */
type OnNavigate = Parameters<Parameters<typeof onNavigateType>[0]>[0];

const { onNavigate } = vi.hoisted(() => ({ onNavigate: vi.fn() }));
vi.mock('$app/navigation', () => ({ onNavigate }));

import { enableViewTransitionApi } from './viewTransitionApi.svelte';

type Callback = (navigation: OnNavigate) => void | Promise<void>;

function registeredCallback(): Callback {
	enableViewTransitionApi();
	const callback = onNavigate.mock.calls.at(-1)?.[0];
	if (typeof callback !== 'function') throw new Error('onNavigate was not registered');
	return callback;
}

function navigation(overrides: Partial<OnNavigate> = {}): OnNavigate {
	// Only the fields the helper reads
	return {
		type: 'link',
		shallow: false,
		complete: Promise.resolve(),
		...overrides
	} as unknown as OnNavigate;
}

describe('enableViewTransitionApi', () => {
	beforeEach(() => {
		onNavigate.mockClear();
		Reflect.deleteProperty(document, 'startViewTransition');
	});

	test('starts a view transition and lets the navigation continue inside its update', async () => {
		const callback = registeredCallback();
		let update: (() => Promise<void>) | undefined;
		const startViewTransition = vi.fn((fn: () => Promise<void>) => {
			update = fn;
		});
		Object.assign(document, { startViewTransition });

		let completed = false;
		const complete = new Promise<void>((resolve) =>
			setTimeout(() => {
				completed = true;
				resolve();
			}, 0)
		);
		const result = callback(navigation({ complete }));
		expect(startViewTransition).toHaveBeenCalledOnce();

		// SvelteKit waits for the returned promise, which resolves once the browser runs the update
		await update?.();
		await expect(result).resolves.toBeUndefined();
		// and the update itself waits for the navigation, so the new page is what gets snapshotted
		expect(completed).toBe(true);
	});

	test('does nothing without the API', () => {
		const callback = registeredCallback();
		expect(callback(navigation())).toBeUndefined();
	});

	test('skips shallow gotos, which change the URL but not the page', () => {
		const callback = registeredCallback();
		const startViewTransition = vi.fn();
		Object.assign(document, { startViewTransition });
		expect(callback(navigation({ shallow: true, type: 'goto' }))).toBeUndefined();
		expect(startViewTransition).not.toHaveBeenCalled();
	});
});
