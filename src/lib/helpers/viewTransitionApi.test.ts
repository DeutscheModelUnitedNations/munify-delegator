import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { onNavigate as onNavigateType } from '$app/navigation';

/** The callback's argument, as SvelteKit types it (the type itself is not exported) */
type OnNavigate = Parameters<Parameters<typeof onNavigateType>[0]>[0];

const { onNavigate } = vi.hoisted(() => ({ onNavigate: vi.fn() }));
vi.mock('$app/navigation', () => ({ onNavigate }));

import { enableViewTransitionApi } from './viewTransitionApi.svelte';

/** A transition whose promises settle like a browser's when it is skipped */
function fakeTransition(rejection?: Error) {
	const settle = () => (rejection ? Promise.reject(rejection) : Promise.resolve());
	return { ready: settle(), finished: settle(), updateCallbackDone: settle() };
}

type Callback = (navigation: OnNavigate) => void | Promise<void>;

function registeredCallback(): Callback {
	enableViewTransitionApi();
	const callback = onNavigate.mock.calls.at(-1)?.[0];
	if (typeof callback !== 'function') throw new Error('onNavigate was not registered');
	return callback;
}

function navigation(
	overrides: Partial<Omit<OnNavigate, 'from' | 'to'>> & {
		from?: { url: URL };
		to?: { url: URL };
	} = {}
): OnNavigate {
	// Only the fields the helper reads
	return {
		type: 'link',
		shallow: false,
		from: { url: new URL('https://example.org/team/stats') },
		to: { url: new URL('https://example.org/team/participants') },
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
			return fakeTransition();
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

	test('skips navigations that keep the path, such as a table writing its search into the URL', () => {
		const callback = registeredCallback();
		const startViewTransition = vi.fn();
		Object.assign(document, { startViewTransition });
		const url = new URL('https://example.org/team/waiting-list');
		const result = callback(
			navigation({
				type: 'goto',
				from: { url },
				to: { url: new URL('?filter=x', url) }
			})
		);
		expect(result).toBeUndefined();
		expect(startViewTransition).not.toHaveBeenCalled();
	});

	test('an aborted navigation and a skipped transition raise nothing', async () => {
		const callback = registeredCallback();
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);
		let update: (() => Promise<void>) | undefined;
		Object.assign(document, {
			startViewTransition: (fn: () => Promise<void>) => {
				update = fn;
				return fakeTransition(new Error('Transition was skipped'));
			}
		});
		const complete = Promise.reject(new Error('navigation aborted'));
		const result = callback(navigation({ complete }));

		await expect(update?.()).resolves.toBeUndefined();
		await expect(result).resolves.toBeUndefined();
		await new Promise((resolve) => setTimeout(resolve, 0));
		process.off('unhandledRejection', unhandled);
		expect(unhandled).not.toHaveBeenCalled();
	});
});
