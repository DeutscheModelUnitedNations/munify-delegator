import { parseTableState, type TableState } from './stateSchema';
import { stateKey, type StateColumn } from './tableState';
import type { SavedView } from './views';

/**
 * A grid's state between the URL, the saved view and the screen. The URL holds what one would
 * share or come back to:
 *
 *   view     the chosen view's id, `base` for the built-in one; left out, the view the table opens
 *            with applies (`initialView`)
 *   state    only when the view was changed: the whole state, encoded
 *   q        the search
 *   page     the page, from 2 on
 *
 * So a table's plain address shows its default view, and a copied link shows exactly what its
 * sender saw. Older links (`?filters=`, `sort=`, `columns=`) are not read any more and open the
 * default view.
 */
const GRID_PARAMS = { view: 'view', state: 'state', search: 'q', page: 'page' } as const;

/** The built-in view in the URL, for when a saved view would otherwise open. */
const BASE_VIEW_PARAM = 'base';

function toBase64Url(text: string) {
	let binary = '';
	for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string) {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
	return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function encodeState(state: TableState) {
	return toBase64Url(JSON.stringify(state));
}

/** The state in the URL; `undefined` for anything unreadable. */
export function decodeState(value: string | null | undefined): TableState | undefined {
	if (!value) return undefined;
	try {
		return parseTableState(fromBase64Url(value));
	} catch {
		return undefined;
	}
}

export interface ResolvedGrid {
	/** The chosen view, `null` for the base view */
	view: SavedView | null;
	/** The chosen view's own state, without changes */
	saved: TableState;
	/** The state that applies: the URL's changes, else the view's */
	state: TableState;
	search: string;
	page: number;
}

/** What the URL says the grid shows, given the views there are and the view that opens first. */
export function resolveGrid({
	params,
	views,
	opening,
	base
}: {
	params: Pick<URLSearchParams, 'get'>;
	views: readonly SavedView[];
	/** The view the table opens with when the URL names none */
	opening: SavedView | null;
	base: TableState;
}): ResolvedGrid {
	const wanted = params.get(GRID_PARAMS.view);
	const view =
		wanted === BASE_VIEW_PARAM
			? null
			: wanted
				? (views.find((candidate) => candidate.id === wanted) ?? null)
				: opening;
	const saved = view?.state ?? base;
	const changed = decodeState(params.get(GRID_PARAMS.state));
	return {
		view,
		saved,
		state: structuredClone(changed ?? saved),
		search: params.get(GRID_PARAMS.search) ?? '',
		page: Math.max(1, Math.floor(Number(params.get(GRID_PARAMS.page))) || 1)
	};
}

/** The URL parameters for the grid; what matches the default is left out. */
export function gridParams({
	view,
	opening,
	state,
	saved,
	search,
	page,
	columns
}: {
	view: SavedView | null;
	opening: SavedView | null;
	state: TableState;
	saved: TableState;
	search: string;
	page: number;
	columns: readonly StateColumn[];
}): Record<string, string | null> {
	const viewParam =
		view && view.id !== opening?.id ? view.id : !view && opening ? BASE_VIEW_PARAM : null;
	const changed = stateKey({ state, columns }) !== stateKey({ state: saved, columns });
	return {
		[GRID_PARAMS.view]: viewParam,
		[GRID_PARAMS.state]: changed ? encodeState(state) : null,
		[GRID_PARAMS.search]: search.trim() || null,
		[GRID_PARAMS.page]: page > 1 ? String(page) : null
	};
}

/** The grid's parameters of a URL's, without the prefix a page with several grids gives them. */
export function openedGridParams({
	searchParams,
	prefix
}: {
	searchParams: Pick<URLSearchParams, 'get'>;
	prefix: string;
}): URLSearchParams {
	const opened = new URLSearchParams();
	for (const key of Object.values(GRID_PARAMS)) {
		const value = searchParams.get(prefix + key);
		if (value !== null) opened.set(key, value);
	}
	return opened;
}

/** The address with the grid's parameters set (`null` removes one), under the page's prefix. */
export function withGridParams({
	href,
	prefix,
	params
}: {
	href: string;
	prefix: string;
	params: Record<string, string | null>;
}): URL {
	const url = new URL(href);
	for (const [key, value] of Object.entries(params)) {
		if (value === null) url.searchParams.delete(prefix + key);
		else url.searchParams.set(prefix + key, value);
	}
	return url;
}
