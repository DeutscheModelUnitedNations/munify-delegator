import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ tableViewPubsub: {}, tableViewDefaultPubsub: {} }));

const { tableViewArgSchemas, viewUpdate } = await import('./tableViewService');

const state = {
	v: 1,
	visibility: {},
	order: [],
	sizes: {},
	sorting: [],
	filter: { type: 'group', op: 'and', items: [] },
	grouping: [],
	groups: { collapsed: false, toggled: [] },
	pageSize: 20
};

describe('tableViewArgSchemas', () => {
	it('takes a state as JSON text or parsed, and refuses one that does not fit', () => {
		expect(tableViewArgSchemas.state.parse(JSON.stringify(state))).toEqual(state);
		expect(tableViewArgSchemas.state.parse(state)).toEqual(state);
		expect(tableViewArgSchemas.state.safeParse({ ...state, pageSize: 3 }).success).toBe(false);
		expect(tableViewArgSchemas.state.safeParse('{').success).toBe(false);
	});

	it('refuses a filter with too many conditions', () => {
		const condition = { type: 'condition', column: 'a', operator: 'contains', value: 'x' };
		const group = { type: 'group', op: 'or', items: Array.from({ length: 30 }, () => condition) };
		const big = { ...state, filter: { type: 'group', op: 'and', items: [group, group] } };
		expect(tableViewArgSchemas.state.safeParse(big).success).toBe(false);
	});

	it('names a view with 1 to 80 characters, trimmed', () => {
		expect(tableViewArgSchemas.name.parse('  Mine  ')).toBe('Mine');
		expect(tableViewArgSchemas.name.safeParse('   ').success).toBe(false);
		expect(tableViewArgSchemas.name.safeParse('x'.repeat(81)).success).toBe(false);
	});

	it('knows only the team’s tables', () => {
		expect(tableViewArgSchemas.tableKey.safeParse('participants').success).toBe(true);
		expect(tableViewArgSchemas.tableKey.safeParse('users').success).toBe(false);
	});
});

describe('viewUpdate', () => {
	it('writes only what is given', () => {
		expect(viewUpdate({ name: 'x' })).toEqual({ name: 'x' });
		expect(viewUpdate({ name: null, state: undefined })).toEqual({});
	});
});
