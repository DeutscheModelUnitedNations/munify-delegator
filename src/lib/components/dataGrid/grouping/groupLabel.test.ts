import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/paraglide/runtime', () => ({ getLocale: () => 'en' }));
vi.mock('#lib/paraglide/messages', () => ({
	m: { yes: () => 'Yes', no: () => 'No', dataGridGroupEmpty: () => '(empty)' }
}));

const { groupLabel } = await import('./groupLabel');

describe('groupLabel', () => {
	const date = { id: 'd', type: 'date' as const, label: 'D' };
	const number = { id: 'n', type: 'number' as const, label: 'N' };

	it('reads dates by their bucket', () => {
		expect(groupLabel({ column: date, groupBy: { column: 'd' }, value: '2026-03' })).toBe(
			'March 2026'
		);
		expect(
			groupLabel({ column: date, groupBy: { column: 'd', bucket: 'year' }, value: '2026' })
		).toBe('2026');
		expect(
			groupLabel({ column: date, groupBy: { column: 'd', bucket: 'day' }, value: '2026-03-04' })
		).toBe('Mar 4, 2026');
	});

	it('reads number ranges, yes and no, enums and the empty group', () => {
		expect(groupLabel({ column: number, groupBy: { column: 'n', step: 10 }, value: '10' })).toBe(
			'10–19'
		);
		expect(groupLabel({ column: number, groupBy: { column: 'n' }, value: '1500' })).toBe('1,500');
		expect(
			groupLabel({
				column: { id: 'b', type: 'boolean', label: 'B' },
				groupBy: { column: 'b' },
				value: 'true'
			})
		).toBe('Yes');
		expect(
			groupLabel({
				column: { id: 'e', type: 'enum', label: 'E', optionLabel: (v) => `<${v}>` },
				groupBy: { column: 'e' },
				value: 'A'
			})
		).toBe('<A>');
		expect(groupLabel({ column: number, groupBy: { column: 'n' }, value: null })).toBe('(empty)');
	});
});
