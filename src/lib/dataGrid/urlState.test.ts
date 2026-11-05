import { describe, expect, it } from 'vitest';
import { baseState } from './tableState';
import { decodeState, encodeState, gridParams, resolveGrid } from './urlState';
import type { SavedView } from './views';

const columns = [{ id: 'name', alwaysVisible: true }, { id: 'city' }];
const base = baseState({ sorting: [{ id: 'name', desc: false }] });

const view = (id: string, overrides: Partial<SavedView> = {}): SavedView => ({
	id,
	name: id,
	state: { ...base, pageSize: 100 },
	shared: true,
	global: false,
	mine: false,
	isDefault: false,
	isMyDefault: false,
	...overrides
});

describe('state in the URL', () => {
	it('round-trips, umlauts included', () => {
		const state = {
			...base,
			filter: {
				type: 'group' as const,
				op: 'and' as const,
				items: [
					{ type: 'condition' as const, column: 'city', operator: 'equals', value: 'München' }
				]
			}
		};
		expect(decodeState(encodeState(state))).toEqual(state);
	});

	it('reads garbage as nothing', () => {
		expect(decodeState('not-base64!')).toBeUndefined();
		expect(decodeState(encodeState({ ...base, pageSize: 3 }))).toBeUndefined();
	});
});

describe('resolveGrid', () => {
	const params = (entries: Record<string, string>) => new URLSearchParams(entries);

	it('opens the opening view without parameters', () => {
		const opening = view('a');
		const resolved = resolveGrid({ params: params({}), views: [opening], opening, base });
		expect(resolved.view?.id).toBe('a');
		expect(resolved.state.pageSize).toBe(100);
	});

	it('opens the base view on request, and changes on top of a view', () => {
		const opening = view('a');
		expect(
			resolveGrid({ params: params({ view: 'base' }), views: [opening], opening, base }).view
		).toBeNull();
		const changed = { ...base, pageSize: 20 };
		const resolved = resolveGrid({
			params: params({ view: 'a', state: encodeState(changed), q: 'x', page: '3' }),
			views: [opening],
			opening,
			base
		});
		expect(resolved.saved.pageSize).toBe(100);
		expect(resolved.state.pageSize).toBe(20);
		expect(resolved.search).toBe('x');
		expect(resolved.page).toBe(3);
	});
});

describe('gridParams', () => {
	it('leaves out what is the default', () => {
		expect(
			gridParams({
				view: null,
				opening: null,
				state: base,
				saved: base,
				search: '',
				page: 1,
				columns
			})
		).toEqual({ view: null, state: null, q: null, page: null });
	});

	it('names the base view when a default view exists, and changes', () => {
		const opening = view('a');
		const state = { ...base, visibility: { city: false } };
		const params = gridParams({
			view: null,
			opening,
			state,
			saved: base,
			search: ' x ',
			page: 2,
			columns
		});
		expect(params.view).toBe('base');
		expect(decodeState(params.state)).toEqual(state);
		expect(params.q).toBe('x');
		expect(params.page).toBe('2');
	});
});

describe('the grid’s parameters under a prefix', () => {
	it('reads and writes only its own', async () => {
		const { openedGridParams, withGridParams } = await import('./urlState');
		const search = new URLSearchParams('tab=x&nations-q=ger&q=other');
		expect(openedGridParams({ searchParams: search, prefix: 'nations-' }).get('q')).toBe('ger');
		const url = withGridParams({
			href: 'https://example.org/seats?tab=x&nations-q=ger',
			prefix: 'nations-',
			params: { q: null, page: '2' }
		});
		expect(url.search).toBe('?tab=x&nations-page=2');
	});
});
