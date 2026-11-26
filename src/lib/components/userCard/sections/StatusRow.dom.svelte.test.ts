import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { StatusOption } from '../ui/StateMenu.svelte';
import StatusRow from './StatusRow.svelte';

const options: StatusOption<string>[] = [
	{ value: 'NONE', label: 'Not set yet', short: 'Not set', icon: 'clipboard', tone: 'warning' },
	{ value: 'DONE', label: 'Done', icon: 'check', tone: 'success' }
];

describe('StatusRow', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	function show(active: string) {
		target = document.body.appendChild(document.createElement('div'));
		const change = vi.fn(async () => undefined);
		app = mount(StatusRow<string>, {
			target,
			props: { title: 'Payment', icon: 'money', active, options, change }
		});
		flushSync();
		return change;
	}

	const state = () => target.querySelector('[popovertarget]');
	const settle = () => target.querySelector<HTMLButtonElement>('.btn[aria-label="Payment: Done"]');
	const inMenu = (label: string) =>
		[...target.querySelectorAll<HTMLButtonElement>('[popover] button')].find(
			(button) => button.textContent?.trim() === label
		);

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('says the state alone and settles it with one click while it is open', () => {
		const change = show('NONE');
		expect(state()?.textContent?.trim()).toBe('Not set');
		expect(state()?.getAttribute('aria-label')).toBe('Payment: Not set yet');
		settle()?.click();
		expect(change).toHaveBeenCalledWith('DONE');
	});

	test('has nothing left to settle once it is done', () => {
		show('DONE');
		expect(state()?.textContent?.trim()).toBe('Done');
		expect(settle()).toBeNull();
	});

	test('changes to another state in the menu, never to the one it has', () => {
		const change = show('DONE');
		expect(inMenu('Done')?.getAttribute('aria-pressed')).toBe('true');
		inMenu('Done')?.click();
		expect(change).not.toHaveBeenCalled();
		inMenu('Not set yet')?.click();
		expect(change).toHaveBeenCalledWith('NONE');
	});
});
