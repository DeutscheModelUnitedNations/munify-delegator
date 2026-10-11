/** What the delegations tab keeps in its URL: the group size shown (0: pick one) and the filter. */
export interface BoardParams {
	size: number;
	disqualified: boolean;
}

/** The board's parameters from a URL, in the format links to it have always used. */
export function boardParams(search: URLSearchParams): BoardParams {
	const size = Number(search.get('size'));
	return {
		size: Number.isInteger(size) && size > 0 ? size : 0,
		disqualified: search.get('disqualified') === 'true'
	};
}

/** `url` with the board's parameters in it; defaults are left out. */
export function withBoardParams(url: URL, params: BoardParams) {
	const next = new URL(url);
	if (params.size > 0) next.searchParams.set('size', String(params.size));
	else next.searchParams.delete('size');
	if (params.disqualified) next.searchParams.set('disqualified', 'true');
	else next.searchParams.delete('disqualified');
	return next;
}
