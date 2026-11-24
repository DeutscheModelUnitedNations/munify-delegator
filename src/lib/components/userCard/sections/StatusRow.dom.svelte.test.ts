import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import StatusRow, { type StatusOption } from './StatusRow.svelte';

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

	const button = (label: string) =>
		target.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('says the current state in words on its button, the others only by icon', () => {
		show('NONE');
		expect(button('Not set yet')?.textContent?.trim()).toBe('Not set');
		expect(button('Not set yet')?.getAttribute('aria-pressed')).toBe('true');
		expect(button('Done')?.textContent?.trim()).toBe('');
		expect(button('Done')?.getAttribute('aria-pressed')).toBe('false');
	});

	test('changes to another state, never to the one it has', () => {
		const change = show('NONE');
		button('Not set yet')?.click();
		expect(change).not.toHaveBeenCalled();
		button('Done')?.click();
		expect(change).toHaveBeenCalledWith('DONE');
	});
});
