import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/paraglide/runtime', () => ({ getLocale: () => 'de' }));
vi.mock('#lib/paraglide/messages', () => ({ m: { yes: () => 'Ja', no: () => 'Nein' } }));

const { cellText, exportText, formatValue } = await import('./gridColumn');

describe('formatValue', () => {
	it('reads each type the way its column says', () => {
		const label = (value: string) => `<${value}>`;
		expect(formatValue({ column: { id: 'b', type: 'boolean', label: 'B' }, value: false })).toBe(
			'Nein'
		);
		expect(formatValue({ column: { id: 'n', type: 'number', label: 'N' }, value: 1234.5 })).toBe(
			'1.234,5'
		);
		expect(
			formatValue({ column: { id: 'd', type: 'date', label: 'D' }, value: '2026-03-04' })
		).toBe('04.03.2026');
		expect(
			formatValue({ column: { id: 'e', type: 'enum', label: 'E', optionLabel: label }, value: 'X' })
		).toBe('<X>');
		expect(
			formatValue({
				column: { id: 'm', type: 'multiEnum', label: 'M', optionLabel: label },
				value: ['A', 'B']
			})
		).toBe('<A>, <B>');
		expect(formatValue({ column: { id: 't', type: 'text', label: 'T' }, value: null })).toBe('');
	});
});

describe('cellText and exportText', () => {
	const row = { name: 'ada' };
	it('prefer the column’s own text, then its value', () => {
		const column = { id: 'n', type: 'text' as const, label: 'N', value: (r: typeof row) => r.name };
		expect(cellText({ column, row })).toBe('ada');
		expect(cellText({ column: { ...column, text: () => 'Ada' }, row })).toBe('Ada');
		expect(exportText({ column: { ...column, exportValue: () => 'ADA' }, row })).toBe('ADA');
		expect(cellText({ column: { id: 'x', type: 'text', label: 'X' }, row })).toBe('');
	});
});
