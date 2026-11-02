import { onNavigate } from '$app/navigation';

/**
 * Turns every client-side navigation into a view transition, after chase.
 *
 * Call it once, in the root layout. The browser then cross-fades from the old page to the new one
 * (`app.css` sets the timing, and switches it off for people who asked for reduced motion). An
 * element that is on both pages keeps its place when it carries a `view-transition-name` that is
 * the same before and after - the header, the side navigation, and the navigation's active entry,
 * which so glides from the old entry to the new one:
 *
 * ```svelte
 * <div style="view-transition-name: some-unique-{id};">Fancy!</div>
 * ```
 *
 * A name has to be unique on the page while the transition runs, or the browser skips it.
 *
 * Shallow `goto`s and navigations that keep the path (a table's search, sort and page in the URL,
 * the assignment board's filters) are no navigation to the eye and get none. Browsers without the
 * API navigate as before.
 *
 * A transition that is cut short, by a newer navigation aborting this one or by the browser
 * skipping it, rejects its promises; those are expected and handled here, or every one would be
 * an uncaught error.
 */
export function enableViewTransitionApi() {
	onNavigate((navigation) => {
		if (navigation.shallow && navigation.type === 'goto') return;
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				// an aborted navigation leaves the page to the one that replaced it
				await navigation.complete.catch(() => undefined);
			});
			// skipped transitions reject these; the navigation goes on regardless
			transition.ready.catch(() => undefined);
			transition.finished.catch(() => undefined);
			transition.updateCallbackDone.catch(() => undefined);
		});
	});
}
