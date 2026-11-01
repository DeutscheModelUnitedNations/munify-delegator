import { createContext } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';

/**
 * URL state of the seat planning page. The matrix filters and sorting and the hints sidebar (which
 * can jump to the unseated states of a group) share it. A missing parameter means the default
 * (states tab, sorted by name), which keeps it out of the URL.
 */
interface SeatPlanningParams {
	tab: string | null;
	q: string | null;
	group: string | null;
	noSeat: boolean | null;
	size: number | null;
	sort: string | null;
	desc: boolean | null;
}

function readParams(search: Pick<URLSearchParams, 'get' | 'has'>): SeatPlanningParams {
	const flag = (key: string) => (search.has(key) ? search.get(key) !== 'false' : null);
	const size = Number.parseFloat(search.get('size') ?? '');
	return {
		tab: search.get('tab'),
		q: search.get('q'),
		group: search.get('group'),
		noSeat: flag('noSeat'),
		size: Number.isNaN(size) ? null : size,
		sort: search.get('sort'),
		desc: flag('desc')
	};
}

/** `href` with the parameters in it; empty ones are left out. */
function withParams({ href, params }: { href: string; params: SeatPlanningParams }) {
	const url = new URL(href);
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === '') url.searchParams.delete(key);
		else url.searchParams.set(key, String(value));
	}
	return url;
}

const [useSeatPlanningParams, setSeatPlanningParams] = createContext<SeatPlanningParams>();

/**
 * Called once by the page, before its first `await`. The parameters are state, mirrored into the
 * URL on the next task, like the assignment board's: `sveltekit-search-params` reads and writes
 * `page`, which lands while the matrix's first queries are pending, and Svelte trips its "Batch
 * has scheduled effects" invariant on the overlap.
 */
export function provideSeatPlanningParams() {
	const params = $state(readParams(page.url.searchParams));
	$effect(() => {
		const next = { ...params };
		const timer = setTimeout(() => {
			// The browser's own URL: `page.url` does not follow shallow navigations.
			const url = withParams({ href: location.href, params: next });
			if (url.search !== location.search)
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- the current page's own URL, with other query parameters
				goto(url, { shallow: true, replace: true, state: page.state });
		});
		return () => clearTimeout(timer);
	});
	return setSeatPlanningParams(params);
}

export { useSeatPlanningParams };
