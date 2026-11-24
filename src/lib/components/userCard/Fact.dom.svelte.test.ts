import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import { m } from '#lib/paraglide/messages';
import Fact from './Fact.svelte';

describe('Fact', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	function show(props: ComponentProps<typeof Fact>) {
		target = document.body.appendChild(document.createElement('dl'));
		app = mount(Fact, { target, props });
		flushSync();
		return target.querySelector('dd')?.textContent?.trim();
	}

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('shows a value, which a click copies', () => {
		const writeText = vi.fn(async () => undefined);
		vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
		expect(show({ label: 'Diet', value: 'Vegan', matters: true })).toBe('Vegan');
		target.querySelector('button')?.click();
		expect(writeText).toHaveBeenCalledWith('Vegan');
		vi.unstubAllGlobals();
	});

	test('links a value that leads somewhere', () => {
		show({ label: 'Phone', value: '+49151', href: 'tel:+49151' });
		expect(target.querySelector('a')?.getAttribute('href')).toBe('tel:+49151');
		expect(target.querySelector('a')?.textContent).toBe('+49151');
	});

	test('calls nothing missing unless it matters to this reader', () => {
		expect(show({ label: 'Phone', value: null, matters: true })).toBe(m.userCardMissing());
		if (app) unmount(app);
		target.remove();
		expect(show({ label: 'Phone', value: ' ' })).toBe(m.noStatement());
	});
});
