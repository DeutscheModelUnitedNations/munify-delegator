import { settled } from 'svelte';

/** How long a switch waits for the next chat to render before showing whatever is there */
const MAX_WAIT = 300;

let running = 0;

/**
 * Switches the messenger's open chat as a view transition. `direction` picks the animation in
 * `app.css` (`data-chat-transition`): `open` and `back` slide between list and thread on a phone,
 * on a wide screen every switch cross-fades the thread pane. `update` makes the change; the
 * browser keeps showing the old state until it and its async work are done, or `MAX_WAIT` passed.
 * Browsers without the API just switch.
 */
export function chatViewTransition({
	direction,
	update
}: {
	direction: 'open' | 'switch' | 'back';
	update: () => void;
}) {
	if (!document.startViewTransition) {
		update();
		return;
	}
	const root = document.documentElement;
	const id = ++running;
	root.dataset.chatTransition = direction;
	const transition = document.startViewTransition(async () => {
		update();
		await Promise.race([settled(), new Promise((resolve) => setTimeout(resolve, MAX_WAIT))]);
	});
	// a newer switch skips this one, which rejects these
	transition.ready.catch(() => undefined);
	transition.updateCallbackDone.catch(() => undefined);
	void transition.finished
		.catch(() => undefined)
		.finally(() => {
			if (id === running) delete root.dataset.chatTransition;
		});
}
