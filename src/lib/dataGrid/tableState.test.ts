import { describe, expect, it } from 'vitest';
import { baseState, effectiveOrder, moveColumn, stateKey, visibleColumnIds } from './tableState';

const columns = [
	{ id: 'name', alwaysVisible: true },
	{ id: 'email' },
	{ id: 'phone', defaultVisible: false }
];

describe('columns', () => {
	it('keeps pinned columns in front and appends new ones', () => {
		expect(effectiveOrder({ columns, order: ['phone', 'name'] })).toEqual([
			'name',
			'phone',
			'email'
		]);
	});

	it('shows columns by their default unless the state says', () => {
		expect(visibleColumnIds({ columns, state: baseState() })).toEqual(['name', 'email']);
		expect(
			visibleColumnIds({
				columns,
				state: { ...baseState(), visibility: { phone: true, name: false } }
			})
		).toEqual(['name', 'email', 'phone']);
	});

	it('never moves a column past a pinned one', () => {
		expect(
			moveColumn({ ids: ['name', 'email', 'phone'], id: 'email', delta: -1, locked: ['name'] })
		).toEqual(['name', 'email', 'phone']);
		expect(
			moveColumn({ ids: ['name', 'email', 'phone'], id: 'email', delta: 1, locked: ['name'] })
		).toEqual(['name', 'phone', 'email']);
	});
});

describe('stateKey', () => {
	it('sees an explicit default as no change', () => {
		const state = baseState();
		expect(stateKey({ state: { ...state, visibility: { phone: false } }, columns })).toBe(
			stateKey({ state, columns })
		);
		expect(stateKey({ state: { ...state, visibility: { phone: true } }, columns })).not.toBe(
			stateKey({ state, columns })
		);
	});
});
