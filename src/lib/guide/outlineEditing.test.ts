import { describe, expect, test } from 'vitest';
import {
	addSection,
	audienceOf,
	missingPages,
	moveItem,
	newSectionId,
	newSlot,
	removeSection,
	setTemplateEnabled,
	toggleRole,
	updateSection
} from './outlineEditing';
import type { Outline } from './outline';

const outline: Outline = {
	sections: [
		{ id: 'a', title: 'A', audience: { type: 'everyone' }, entries: [{ pageId: 'p1' }] },
		{ id: 'b', title: 'B', audience: { type: 'delegates' }, entries: [] },
		{ id: 'c', title: 'C', audience: { type: 'supervisors' }, entries: [{ pageId: 'p2' }] }
	],
	committeeTemplate: {
		position: 2,
		titleFormat: 'COMMITTEE_NAME',
		slots: [{ type: 'page', pageId: 'p3' }, { type: 'committeePage' }]
	}
};

describe('moveItem', () => {
	test('moves within the list and refuses to leave it', () => {
		expect(moveItem({ list: [1, 2, 3], index: 0, by: 1 })).toEqual([2, 1, 3]);
		expect(moveItem({ list: [1, 2, 3], index: 2, by: 1 })).toEqual([1, 2, 3]);
		expect(moveItem({ list: [1, 2, 3], index: 0, by: -1 })).toEqual([1, 2, 3]);
	});
});

test('audienceOf keeps the custom roles a section had', () => {
	expect(audienceOf({ type: 'everyone' })).toEqual({ type: 'everyone' });
	expect(
		audienceOf({ type: 'customRoles', current: { type: 'customRoles', roleIds: ['press'] } })
	).toEqual({ type: 'customRoles', roleIds: ['press'] });
	expect(audienceOf({ type: 'customRoles', roleIds: ['judge'] })).toEqual({
		type: 'customRoles',
		roleIds: ['judge']
	});
});

test('sections are added with a fresh id and updated by index', () => {
	expect(newSectionId(outline)).toBe('section-4');
	const added = addSection({ outline, title: 'Neu' });
	expect(added.sections.at(-1)).toMatchObject({ id: 'section-4', title: 'Neu' });
	const renamed = updateSection({ outline, index: 1, change: (s) => ({ ...s, title: 'X' }) });
	expect(renamed.sections[1].title).toBe('X');
	expect(outline.sections[1].title).toBe('B');
});

test('removing a section before the template moves the template with it', () => {
	expect(removeSection({ outline, index: 0 }).committeeTemplate?.position).toBe(1);
	expect(removeSection({ outline, index: 2 }).committeeTemplate?.position).toBe(2);
});

test('the template is switched on with the committee slots, off without a trace', () => {
	const off = setTemplateEnabled({ outline, enabled: false });
	expect(off.committeeTemplate).toBeUndefined();
	const on = setTemplateEnabled({ outline: off, enabled: true });
	expect(on.committeeTemplate?.slots.map((slot) => slot.type)).toEqual([
		'committeePage',
		'agendaItemPages'
	]);
	expect(setTemplateEnabled({ outline, enabled: true })).toBe(outline);
});

test('missingPages lists pages that do not reach the conference', () => {
	expect(missingPages({ outline, available: new Set(['p1', 'p3']) })).toEqual(['p2']);
});

test('toggleRole adds and removes roles but keeps one', () => {
	const audience = { type: 'customRoles' as const, roleIds: ['press'] };
	expect(toggleRole({ audience, roleId: 'judge', on: true })).toEqual({
		type: 'customRoles',
		roleIds: ['press', 'judge']
	});
	expect(toggleRole({ audience, roleId: 'press', on: false })).toBe(audience);
	expect(toggleRole({ audience: { type: 'everyone' }, roleId: 'x', on: true })).toEqual({
		type: 'everyone'
	});
});

test('newSlot starts page slots with a page', () => {
	expect(newSlot({ type: 'page', firstPageId: 'p' })).toEqual({ type: 'page', pageId: 'p' });
	expect(newSlot({ type: 'agendaItemPages', firstPageId: 'p' })).toEqual({
		type: 'agendaItemPages'
	});
});
