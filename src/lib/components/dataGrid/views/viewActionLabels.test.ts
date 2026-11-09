import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/paraglide/messages', () => ({
	m: new Proxy(
		{},
		{
			get: (_target, key) => (args?: { name?: string }) =>
				`${String(key)}${args?.name ? `:${args.name}` : ''}`
		}
	)
}));

const { deleteConfirmText, viewActionEntry } = await import('./viewActionLabels');
const { baseState } = await import('#lib/dataGrid/tableState');

const view = {
	id: 'v',
	name: 'Mine',
	state: baseState(),
	shared: false,
	global: false,
	mine: true,
	isDefault: false,
	isMyDefault: false
};

describe('viewActionEntry', () => {
	it('words an action after the view it acts on', () => {
		expect(viewActionEntry({ action: 'save', current: view }).label).toBe('dataGridViewSave:Mine');
		expect(viewActionEntry({ action: 'myDefault', current: null }).label).toBe(
			'dataGridViewBaseAsMyDefault'
		);
		expect(
			viewActionEntry({ action: 'myDefault', current: { ...view, isMyDefault: true } }).label
		).toBe('dataGridViewUnsetMyDefault');
		expect(
			viewActionEntry({ action: 'setDefault', current: { ...view, isDefault: true } }).icon
		).toBe('ph-star-half');
		expect(viewActionEntry({ action: 'delete', current: view }).danger).toBe(true);
	});
});

describe('deleteConfirmText', () => {
	it('warns that a shared view goes for everyone', () => {
		expect(deleteConfirmText(view)).toBe('dataGridViewDeleteConfirm:Mine');
		expect(deleteConfirmText({ ...view, shared: true })).toBe(
			'dataGridViewDeleteSharedConfirm:Mine'
		);
	});
});
