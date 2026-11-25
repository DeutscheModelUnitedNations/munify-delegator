import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import StateMenu, { type StatusOption } from './StateMenu.svelte';

const options: StatusOption<string>[] = [
	{ value: 'NONE', label: 'Not set yet', tone: 'warning' },
	{ value: 'DONE', label: 'Done', tone: 'success' },
	{ value: 'PROBLEM', label: 'Problem', tone: 'error' }
];

describe('StateMenu keys', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount>;
	let menu: HTMLElement;
	let entries: HTMLButtonElement[];
	let open: boolean;
	const hidePopover = vi.fn(() => void (open = false));

	beforeEach(() => {
		target = document.body.appendChild(document.createElement('div'));
		app = mount(StateMenu<string>, {
			target,
			props: { name: 'Payment', active: 'DONE', options, onSelect: vi.fn() }
		});
		flushSync();
		const found = target.querySelector<HTMLElement>('[popover]');
		if (!found) throw new Error('No menu');
		menu = found;
		entries = [...menu.querySelectorAll('button')];
		// jsdom opens no popovers: it hides what has the attribute, which then takes no focus
		menu.removeAttribute('popover');
		open = true;
		hidePopover.mockClear();
		Object.assign(menu, { matches: () => open, hidePopover });
	});

	afterEach(() => {
		unmount(app);
		target.remove();
	});

	/** Presses a key on what has the focus; whether it reached what is around the menu. */
	function press(key: string) {
		const around = vi.fn();
		document.body.addEventListener('keydown', around, { once: true });
		const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		(document.activeElement ?? menu).dispatchEvent(event);
		document.body.removeEventListener('keydown', around);
		return { reachedAround: around.mock.calls.length > 0, prevented: event.defaultPrevented };
	}

	test('move through the states, around at both ends', () => {
		entries[1].focus();
		expect(press('ArrowDown').prevented).toBe(true);
		expect(document.activeElement).toBe(entries[2]);
		press('ArrowDown');
		expect(document.activeElement).toBe(entries[0]);
		press('ArrowUp');
		expect(document.activeElement).toBe(entries[2]);
	});

	test('close the menu alone with Escape, back to its state', () => {
		entries[1].focus();
		expect(press('Escape').reachedAround).toBe(false);
		expect(hidePopover).toHaveBeenCalled();
		expect(document.activeElement).toBe(target.querySelector('[popovertarget]'));
	});

	test('leave everything else to the page', () => {
		entries[1].focus();
		expect(press('Tab')).toEqual({ reachedAround: true, prevented: false });
		open = false;
		expect(press('Escape').reachedAround).toBe(true);
		press('ArrowDown');
		expect(document.activeElement).toBe(entries[1]);
		expect(hidePopover).not.toHaveBeenCalled();
	});
});
