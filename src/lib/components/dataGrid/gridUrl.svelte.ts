import { settled } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { openedGridParams, withGridParams } from '#lib/dataGrid/urlState';

/**
 * A grid's state in the URL (`#lib/dataGrid/urlState` says what goes where), after the assignment
 * board: read once when the grid opens, and mirrored back without a navigation. A navigation (what
 * `sveltekit-search-params` does) lands in a batch of its own while the grid's new rows are still
 * loading, and Svelte trips its "Batch has scheduled effects" invariant on the overlap. So the URL
 * is written with a shallow `goto`, once Svelte has `settled` the change it follows, on the next
 * task.
 *
 * Create it at the top of a component, before its first `await`: after one, a server render has
 * no request to read the URL of.
 */
export function createGridUrl({ prefix = '' }: { prefix?: string } = {}) {
	/** The parameters without the prefix, which only pages with more than one grid need */
	const opened = openedGridParams({ searchParams: page.url.searchParams, prefix });
	let latest: Record<string, string | null> | undefined;
	let scheduled = false;

	async function flush() {
		await settled();
		setTimeout(() => {
			scheduled = false;
			if (!latest) return;
			// The browser's own URL: `page.url` does not follow shallow navigations.
			const url = withGridParams({ href: location.href, prefix, params: latest });
			latest = undefined;
			if (url.search !== location.search)
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- the current page's own URL, with other query parameters
				void goto(url, { shallow: true, replace: true, state: page.state });
		});
	}

	return {
		/** The parameters as they were when the grid opened */
		opened,
		/** Writes the parameters (the latest call wins); `null` removes one */
		write(next: Record<string, string | null>) {
			latest = next;
			if (scheduled) return;
			scheduled = true;
			void flush();
		}
	};
}
