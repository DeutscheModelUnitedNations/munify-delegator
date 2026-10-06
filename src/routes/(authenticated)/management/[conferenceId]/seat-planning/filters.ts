import { queryParameters, ssp } from 'sveltekit-search-params';

/**
 * URL state of the seat planning page. The matrix filters and the hints sidebar (which can jump to
 * the unseated states of a group) share it.
 */
export const useSeatPlanningParams = () =>
	queryParameters(
		{
			tab: ssp.string('states'),
			q: ssp.string(),
			group: ssp.string(),
			noSeat: ssp.boolean(),
			size: ssp.number()
		},
		// keep the URL short: only filters that differ from their defaults
		{ pushHistory: false, showDefaults: false }
	);
