import { afterEach, describe, expect, test, vi } from 'vitest';
import { CombinedError } from '@urql/core';
import { flushSync, mount, settled, unmount } from 'svelte';
import Probe from './PageBoundaryProbe.svelte';
import { logger } from '#lib/logger';

/** The promise's resolution reaches the boundary a few microtasks later; let them all run */
async function resolved() {
	await settled();
	await new Promise((done) => setTimeout(done, 0));
	flushSync();
}

function deferred() {
	let resolve: (value: string) => void = () => {};
	let reject: (error: unknown) => void = () => {};
	const promise = new Promise<string>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

describe('PageBoundary', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('shows the skeleton while the page loads, then the page, and a skeleton again for a new key', async () => {
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({ key: '/team/participants', load: deferred() });
		app = mount(Probe, { target, props: { key: props.key, load: () => props.load.promise } });
		flushSync();

		expect(target.querySelector('[data-skeleton="participants"]')).not.toBeNull();
		expect(target.querySelector('[data-content]')).toBeNull();

		props.load.resolve('participants');
		await resolved();
		expect(target.querySelector('[data-skeleton]')).toBeNull();
		expect(target.querySelector('[data-content]')?.textContent).toBe('participants');
	});

	test('re-creates the boundary for a new key, so the next page shows its skeleton too', async () => {
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({ key: '/team/participants', load: deferred() });
		app = mount(Probe, {
			target,
			props: {
				get key() {
					return props.key;
				},
				get load() {
					const current = props.load;
					return () => current.promise;
				}
			}
		});
		flushSync();
		props.load.resolve('participants');
		await resolved();
		expect(target.querySelector('[data-content]')?.textContent).toBe('participants');

		props.load = deferred();
		props.key = '/team/seats';
		flushSync();
		expect(target.querySelector('[data-skeleton]')).not.toBeNull();
		expect(target.querySelector('[data-content]')).toBeNull();

		props.load.resolve('seats');
		await resolved();
		expect(target.querySelector('[data-skeleton]')).toBeNull();
		expect(target.querySelector('[data-content]')?.textContent).toBe('seats');
	});

	test('shows a retry when the page fails to load, and loads again on retry', async () => {
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
		try {
			target = document.body.appendChild(document.createElement('div'));
			let load = deferred();
			app = mount(Probe, {
				target,
				props: { key: '/team/waiting-list', load: () => load.promise }
			});
			flushSync();

			load.reject(new CombinedError({ networkError: new TypeError('Load failed') }));
			await resolved();
			expect(target.querySelector('[data-skeleton]')).toBeNull();
			expect(target.querySelector('[data-content]')).toBeNull();
			expect(target.querySelector('[role="alert"]')).not.toBeNull();
			expect(warn).toHaveBeenCalledOnce();
			expect(unhandled).not.toHaveBeenCalled();

			load = deferred();
			target.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
			flushSync();
			load.resolve('waiting list');
			await resolved();
			expect(target.querySelector('[role="alert"]')).toBeNull();
			expect(target.querySelector('[data-content]')?.textContent).toBe('waiting list');
		} finally {
			process.off('unhandledRejection', unhandled);
			warn.mockRestore();
		}
	});
});
