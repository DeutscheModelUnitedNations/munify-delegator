import { describe, expect, it } from 'vitest';
import { SELECT_WIDTH, gridLayout } from './layout';

const columns = [
	{ id: 'name', type: 'text' as const, label: 'Name', alwaysVisible: true, size: 200 },
	{ id: 'city', type: 'text' as const, label: 'City' },
	{ id: 'age', type: 'number' as const, label: 'Age', size: 80 }
];

describe('gridLayout', () => {
	it('takes the view’s widths over the columns’ own', () => {
		const layout = gridLayout({ columns, sizes: { age: 120 }, selectable: false, actionsWidth: 0 });
		expect(layout.cells.map((cell) => cell.width)).toEqual([200, 160, 120]);
		expect(layout.total).toBe(480);
	});

	it('pins the name after the selection column', () => {
		const layout = gridLayout({ columns, sizes: {}, selectable: true, actionsWidth: 96 });
		expect(layout.cells.map((cell) => cell.left)).toEqual([SELECT_WIDTH, undefined, undefined]);
		expect(layout.total).toBe(SELECT_WIDTH + 200 + 160 + 80 + 96);
	});
});
