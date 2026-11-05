import { describe, expect, it } from 'vitest';
import { tableExport } from './exportRows';

describe('tableExport', () => {
	it('exports what the cells read, or what a column says to export', () => {
		const rows = [{ name: 'Ada', role: 'MEMBER', active: true }];
		const result = tableExport({
			columns: [
				{ id: 'name', type: 'text', label: 'Name', value: (row) => row.name },
				{
					id: 'role',
					type: 'enum',
					label: 'Role',
					value: (row) => row.role,
					optionLabel: (value) => `Role ${value}`
				},
				{
					id: 'active',
					type: 'boolean',
					label: 'Active',
					value: (row) => row.active,
					exportValue: () => 'x'
				}
			],
			rows
		});
		expect(result).toEqual({
			header: ['Name', 'Role', 'Active'],
			data: [['Ada', 'Role MEMBER', 'x']]
		});
	});
});
