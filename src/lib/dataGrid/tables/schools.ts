import type { ColumnMeta } from '../columnTypes';

/** The schools table's columns as the API and the page share them (see `participants.ts`). */
export const SCHOOLS_COLUMNS = [
	{ id: 'name', type: 'text', groupable: false },
	{ id: 'city', type: 'text' },
	{ id: 'delegations', type: 'number' },
	{ id: 'participants', type: 'number' },
	{ id: 'applied', type: 'number' },
	{ id: 'seated', type: 'number' },
	{ id: 'supervisors', type: 'number' },
	{ id: 'waitingList', type: 'number' }
] as const satisfies readonly ColumnMeta[];

/** A school row as the API answers it (the table reads its rows straight from the query). */
export interface SchoolRow {
	id: string;
	name: string;
	city: string | null;
	delegations: number;
	participants: number;
	applied: number;
	seated: number;
	supervisors: number;
	waitingList: number;
}
