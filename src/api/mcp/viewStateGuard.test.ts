import { describe, expect, it } from 'vitest';
import { DATA_TABLE_KEYS } from '#lib/dataGrid/tableKeys';
import type { FilterCondition, TableState } from '#lib/dataGrid/stateSchema';
import { assistantViewStateProblems, TABLE_COLUMN_CLASSES, TABLE_COLUMNS } from './viewStateGuard';

function state(overrides: Partial<TableState> = {}): TableState {
	return {
		v: 1,
		visibility: {},
		order: [],
		sizes: {},
		sorting: [],
		filter: { type: 'group', op: 'and', items: [] },
		grouping: [],
		groups: { collapsed: false, toggled: [] },
		pageSize: 50,
		...overrides
	};
}

function filtered(...conditions: Omit<FilterCondition, 'type'>[]) {
	return state({
		filter: {
			type: 'group',
			op: 'and',
			items: conditions.map((condition) => ({ type: 'condition', ...condition }))
		}
	});
}

describe('TABLE_COLUMN_CLASSES', () => {
	it.each(DATA_TABLE_KEYS)('classifies every column of %s exactly once', (tableKey) => {
		const { visible, redacted } = TABLE_COLUMN_CLASSES[tableKey];
		const classified = [...visible, ...redacted];
		expect(new Set(classified).size).toBe(classified.length);
		expect(classified.sort()).toEqual(TABLE_COLUMNS[tableKey].map((column) => column.id).sort());
	});
});

describe('assistantViewStateProblems', () => {
	it('lets an assistant filter, sort and group by columns without personal data', () => {
		expect(
			assistantViewStateProblems({
				tableKey: 'participants',
				state: {
					...filtered(
						{ column: 'paymentStatus', operator: 'anyOf', value: ['PENDING', 'PROBLEM'] },
						{ column: 'school', operator: 'contains', value: 'Goethe' },
						{ column: 'waitingListSince', operator: 'inLast', value: { amount: 3, unit: 'days' } },
						{ column: 'city', operator: 'empty' }
					),
					sorting: [{ id: 'school', desc: false }],
					grouping: [{ column: 'role' }],
					groups: { collapsed: false, toggled: ['SUPERVISOR'] }
				}
			})
		).toEqual([]);
	});

	it('lets an assistant show, move and size any column, a name too', () => {
		expect(
			assistantViewStateProblems({
				tableKey: 'participants',
				state: state({
					visibility: { email: true, phone: false },
					order: ['family_name', 'given_name', 'school'],
					sizes: { family_name: 200 }
				})
			})
		).toEqual([]);
	});

	it('refuses filtering, sorting and grouping by personal data', () => {
		expect(
			assistantViewStateProblems({
				tableKey: 'participants',
				state: {
					...filtered({ column: 'family_name', operator: 'equals', value: 'Muster' }),
					sorting: [{ id: 'birthday', desc: true }],
					grouping: [{ column: 'gender' }]
				}
			})
		).toEqual([
			'filtering by family_name, which is personal data',
			'sorting by birthday, which is personal data',
			'grouping by gender, which is personal data'
		]);
	});

	it('refuses column ids the table does not have, wherever they appear', () => {
		expect(
			assistantViewStateProblems({
				tableKey: 'schools',
				state: state({ visibility: { 'Erika Muster': true }, order: ['name'] })
			})
		).toEqual(['the table has no column Erika Muster']);
	});

	it('refuses operators and values that do not fit the column', () => {
		expect(
			assistantViewStateProblems({
				tableKey: 'participants',
				state: filtered(
					{ column: 'school', operator: 'Erika Muster', value: 'x' },
					{ column: 'participationCount', operator: 'eq', value: 'Erika' },
					{
						column: 'participationCount',
						operator: 'between',
						value: { from: 1, to: 3, note: 'Erika' }
					},
					{ column: 'paymentStatus', operator: 'anyOf', value: ['DONE', 'Erika'] }
				)
			})
		).toEqual([
			'filter: column school has no operator Erika Muster',
			'filter: the value for participationCount does not fit its operator',
			'filter: the value for participationCount has no field note',
			'filter: paymentStatus has no option Erika'
		]);
	});

	it('refuses toggled groups without any grouping', () => {
		expect(
			assistantViewStateProblems({
				tableKey: 'teamMembers',
				state: state({ groups: { collapsed: false, toggled: ['Erika Muster'] } })
			})
		).toEqual(['groups: toggled groups without any grouping']);
	});
});
