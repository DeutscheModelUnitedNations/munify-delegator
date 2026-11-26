import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { m } from '#lib/paraglide/messages';
import EditableRow from './EditableRow.svelte';

describe('EditableRow', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	function show(onSave = vi.fn(async (_value: string) => undefined)) {
		target = document.body.appendChild(document.createElement('div'));
		app = mount(EditableRow, {
			target,
			props: { icon: 'hash', title: 'Number', value: '31', onSave }
		});
		flushSync();
		return onSave;
	}

	const input = () => target.querySelector('input');
	const press = (label: string) => {
		target.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)?.click();
		flushSync();
	};
	const edit = () => press(`Number: ${m.edit()}`);

	function type(value: string) {
		const field = input();
		if (!field) throw new Error('No field');
		field.value = value;
		field.dispatchEvent(new Event('input', { bubbles: true }));
	}

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('is text until it is edited, then saves what was typed', async () => {
		const onSave = show();
		expect(input()).toBeNull();
		edit();
		expect(input()?.value).toBe('31');
		type(' 47 ');
		press(m.save());
		expect(onSave).toHaveBeenCalledWith('47');
		await vi.waitFor(() => expect(input()).toBeNull());
	});

	test('keeps the field when saving fails', async () => {
		const onSave = show(vi.fn(async () => Promise.reject(new Error('taken'))));
		edit();
		type('47');
		press(m.save());
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
		expect(input()).not.toBeNull();
	});

	test('Escape leaves the field alone, and what is around it open', () => {
		show();
		const around = vi.fn();
		target.addEventListener('keydown', around);
		edit();
		input()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();
		expect(input()).toBeNull();
		expect(around).not.toHaveBeenCalled();
	});
});
