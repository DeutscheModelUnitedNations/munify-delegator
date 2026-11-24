import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { m } from '#lib/paraglide/messages';

const { hotkeys } = vi.hoisted(() => ({ hotkeys: new Map<string, () => void>() }));
vi.mock('hotkeys-js', () => ({
	default: Object.assign((key: string, run: () => void) => hotkeys.set(key, run), {
		unbind: (key: string) => hotkeys.delete(key)
	})
}));

const { default: ParticipantAssignedDocumentWidget } =
	await import('./ParticipantAssignedDocumentWidget.svelte');

describe('ParticipantAssignedDocumentWidget', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	function show(assignedDocumentNumber?: number) {
		target = document.body.appendChild(document.createElement('div'));
		const onSave = vi.fn(async () => undefined);
		app = mount(ParticipantAssignedDocumentWidget, {
			target,
			props: { assignedDocumentNumber, onSave }
		});
		flushSync();
		return onSave;
	}

	const button = (label: string) =>
		target.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('offers the next number, by button and Alt+N, to a person without one', () => {
		const onSave = show();
		button(m.saveNextDocumentNumber())?.click();
		expect(onSave).toHaveBeenCalledTimes(1);
		hotkeys.get('alt+n')?.();
		expect(onSave).toHaveBeenCalledTimes(2);
		expect(onSave).toHaveBeenLastCalledWith(undefined);
	});

	test('never replaces a number by the next one, even while it is edited', () => {
		const onSave = show(4);
		button(m.edit())?.click();
		flushSync();
		expect(button(m.save())).not.toBeNull();
		expect(button(m.saveNextDocumentNumber())).toBeNull();
		hotkeys.get('alt+n')?.();
		expect(onSave).not.toHaveBeenCalled();
	});
});
