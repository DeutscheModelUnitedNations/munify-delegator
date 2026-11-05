import { describe, expect, it } from 'vitest';
import { baseState } from './tableState';
import { canEditView, initialView, viewActions, type SavedView } from './views';

const view = (overrides: Partial<SavedView>): SavedView => ({
	id: 'v',
	name: 'v',
	state: baseState(),
	shared: false,
	global: false,
	mine: true,
	isDefault: false,
	isMyDefault: false,
	...overrides
});

const noRights = { manageShared: false, manageGlobal: false };

describe('initialView', () => {
	const conferenceDefault = view({ id: 'c', shared: true, mine: false, isDefault: true });
	const globalDefault = view({ id: 'g', shared: true, global: true, mine: false, isDefault: true });
	const mine = view({ id: 'm', isMyDefault: true });

	it('prefers the own default, then the conference’s, then the global one', () => {
		expect(initialView([globalDefault, conferenceDefault, mine])?.id).toBe('m');
		expect(initialView([globalDefault, conferenceDefault])?.id).toBe('c');
		expect(initialView([globalDefault])?.id).toBe('g');
		expect(initialView([view({})])).toBeNull();
	});
});

describe('canEditView', () => {
	it('lets owners edit personal views, managers shared ones and admins global ones', () => {
		expect(canEditView({ view: view({}), rights: noRights })).toBe(true);
		expect(canEditView({ view: view({ mine: false }), rights: noRights })).toBe(false);
		const shared = view({ shared: true, mine: false });
		expect(canEditView({ view: shared, rights: noRights })).toBe(false);
		expect(canEditView({ view: shared, rights: { ...noRights, manageShared: true } })).toBe(true);
		const global = view({ shared: true, global: true, mine: false });
		expect(canEditView({ view: global, rights: { manageShared: true, manageGlobal: false } })).toBe(
			false
		);
	});
});

describe('viewActions', () => {
	it('offers little on the base view', () => {
		expect(
			viewActions({ current: null, dirty: false, rights: noRights, hasMyDefault: false })
		).toEqual(['saveAs']);
		expect(
			viewActions({ current: null, dirty: true, rights: noRights, hasMyDefault: true })
		).toEqual(['discard', 'saveAs', 'myDefault']);
	});

	it('lets anyone copy a shared view they may not change', () => {
		const shared = view({ shared: true, mine: false });
		expect(
			viewActions({ current: shared, dirty: true, rights: noRights, hasMyDefault: false })
		).toEqual(['discard', 'saveAs', 'myDefault', 'duplicate']);
	});

	it('lets a manager publish their own view', () => {
		expect(
			viewActions({
				current: view({}),
				dirty: false,
				rights: { manageShared: true, manageGlobal: false },
				hasMyDefault: false
			})
		).toEqual(['saveAs', 'rename', 'myDefault', 'publish', 'delete']);
	});
});
