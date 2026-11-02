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
 * Shallow `goto`s (a table's URL state, the assignment board's filters) are no navigation to the
 * eye and get none. Browsers without the API navigate as before.
 */
export function enableViewTransitionApi() {
	onNavigate((navigation) => {
		if (navigation.shallow && navigation.type === 'goto') return;
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
}
