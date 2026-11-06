import { describe, expect, it } from 'vitest';
import { isGroupable, type ColumnMeta } from '../columnTypes';
import { PARTICIPANTS_COLUMNS } from './participants';
import { SCHOOLS_COLUMNS } from './schools';
import { TEAM_MEMBERS_COLUMNS } from './teamMembers';
import { WAITING_LIST_COLUMNS } from './waitingList';

/**
 * Columns whose values are (nearly) one per row: grouping by them makes every row a group of its
 * own, which costs the database a group query per person and shows nothing.
 */
const NOT_GROUPABLE: Record<string, { columns: readonly ColumnMeta[]; ids: readonly string[] }> = {
	participants: {
		columns: PARTICIPANTS_COLUMNS,
		ids: ['userId', 'family_name', 'given_name', 'email', 'phone', 'documentNumber', 'accessCardId']
	},
	waitingList: {
		columns: WAITING_LIST_COLUMNS,
		ids: [
			'position',
			'family_name',
			'given_name',
			'email',
			'phone',
			'motivation',
			'experience',
			'requests'
		]
	},
	teamMembers: {
		columns: TEAM_MEMBERS_COLUMNS,
		ids: ['family_name', 'given_name', 'email', 'phone']
	},
	schools: { columns: SCHOOLS_COLUMNS, ids: ['name'] }
};

describe('groupable columns', () => {
	for (const [table, { columns, ids }] of Object.entries(NOT_GROUPABLE)) {
		it(`${table}: offers no grouping by per-person values`, () => {
			const grouped = columns.filter(isGroupable).map((column) => column.id);
			for (const id of ids) {
				expect(columns.some((column) => column.id === id)).toBe(true);
				expect(grouped).not.toContain(id);
			}
		});
	}
});
