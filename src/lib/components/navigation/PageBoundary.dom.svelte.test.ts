import { afterEach, describe, expect, test } from 'vitest';
import { flushSync, mount, settled, unmount } from 'svelte';
import Probe from './PageBoundaryProbe.svelte';

/** The promise's resolution reaches the boundary a few microtasks later; let them all run */
async function resolved() {
	await settled();
	await new Promise((done) => setTimeout(done, 0));
	flushSync();
}

function deferred() {
	let resolve: (value: string) => void = () => {};
	const promise = new Promise<string>((done) => {
		resolve = done;
	});
	return { promise, resolve };
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

		expect(target.querySelector('[data-skeleton="table"]')).not.toBeNull();
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
});
