import { queryParameters, ssp } from 'sveltekit-search-params';

/**
 * URL state of the seat planning page. The matrix filters and sorting and the hints sidebar (which can jump to
 * the unseated states of a group) share it.
 */
export const useSeatPlanningParams = () =>
	queryParameters(
		{
			// no defaults: a missing parameter means the default (states tab, sorted by name), which
			// keeps it out of the URL
			tab: ssp.string(),
			q: ssp.string(),
			group: ssp.string(),
			noSeat: ssp.boolean(),
			size: ssp.number(),
			sort: ssp.string(),
			desc: ssp.boolean()
		},
		// keep the URL short: only filters that differ from their defaults
		{ pushHistory: false, showDefaults: false }
	);
