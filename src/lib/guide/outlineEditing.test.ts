import { describe, expect, test } from 'vitest';
import {
	addEntry,
	addSection,
	audienceOf,
	dropInTree,
	entriesOfPage,
	moveBlock,
	moveEntry,
	outlineBlocks,
	placePage,
	removeEntry,
	updateEntry,
	withoutPage,
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

describe('the workspace tree', () => {
	const titles = (value: Outline) => value.sections.map((section) => section.id);
	const pages = (value: Outline, index: number) =>
		value.sections[index].entries.map((entry) => entry.pageId);

	test('lists the template among the sections at its position', () => {
		expect(outlineBlocks(outline)).toEqual([
			{ kind: 'section', index: 0 },
			{ kind: 'section', index: 1 },
			{ kind: 'template' },
			{ kind: 'section', index: 2 }
		]);
		expect(outlineBlocks({ sections: outline.sections })).toHaveLength(3);
	});

	test('moves sections and the template as blocks', () => {
		const moved = moveBlock({ outline, from: 3, to: 0 });
		expect(titles(moved)).toEqual(['c', 'a', 'b']);
		expect(moved.committeeTemplate?.position).toBe(3);
		const template = moveBlock({ outline, from: 2, to: 0 });
		expect(titles(template)).toEqual(['a', 'b', 'c']);
		expect(template.committeeTemplate?.position).toBe(0);
		expect(moveBlock({ outline, from: 0, to: 9 })).toBe(outline);
	});

	test('adds, changes and removes entries', () => {
		const added = addEntry({ outline, section: 1, pageId: 'p9', label: 'Neun' });
		expect(added.sections[1].entries).toEqual([{ pageId: 'p9', label: 'Neun' }]);
		expect(pages(addEntry({ outline, section: 0, pageId: 'p0', at: 0 }), 0)).toEqual(['p0', 'p1']);
		const changed = updateEntry({
			outline,
			at: { section: 0, entry: 0 },
			change: (entry) => ({ ...entry, audience: { type: 'delegates' } })
		});
		expect(changed.sections[0].entries[0].audience).toEqual({ type: 'delegates' });
		expect(pages(removeEntry({ outline, at: { section: 0, entry: 0 } }), 0)).toEqual([]);
	});

	test('moves entries between and within sections', () => {
		const across = moveEntry({
			outline,
			from: { section: 0, entry: 0 },
			to: { section: 2, entry: 0 }
		});
		expect(pages(across, 0)).toEqual([]);
		expect(pages(across, 2)).toEqual(['p1', 'p2']);
		const two = addEntry({ outline, section: 0, pageId: 'p4' });
		const within = moveEntry({
			outline: two,
			from: { section: 0, entry: 0 },
			to: { section: 0, entry: 9 }
		});
		expect(pages(within, 0)).toEqual(['p4', 'p1']);
		expect(
			moveEntry({ outline, from: { section: 5, entry: 0 }, to: { section: 0, entry: 0 } })
		).toBe(outline);
	});

	test('finds where a page is listed', () => {
		const twice = addEntry({ outline, section: 1, pageId: 'p1' });
		expect(entriesOfPage({ outline: twice, pageId: 'p1' })).toEqual([
			{ section: 0, entry: 0 },
			{ section: 1, entry: 0 }
		]);
	});
});

describe('dropInTree', () => {
	test('puts a page from outside the guide into a section or the template', () => {
		const drag = { type: 'page', pageId: 'p7' } as const;
		const section = dropInTree({ outline, drag, drop: { type: 'sectionEnd', section: 1 } });
		expect(section.sections[1].entries).toEqual([{ pageId: 'p7' }]);
		const before = dropInTree({
			outline,
			drag,
			drop: { type: 'entry', at: { section: 0, entry: 0 } }
		});
		expect(before.sections[0].entries.map((entry) => entry.pageId)).toEqual(['p7', 'p1']);
		const slot = dropInTree({ outline, drag, drop: { type: 'slot', index: 0 } });
		expect(slot.committeeTemplate?.slots[0]).toEqual({ type: 'page', pageId: 'p7' });
	});

	test('turns an entry into a template slot and a page slot into an entry', () => {
		const toTemplate = dropInTree({
			outline,
			drag: { type: 'entry', at: { section: 0, entry: 0 } },
			drop: { type: 'templateEnd' }
		});
		expect(toTemplate.sections[0].entries).toEqual([]);
		expect(toTemplate.committeeTemplate?.slots.at(-1)).toEqual({ type: 'page', pageId: 'p1' });
		const toSection = dropInTree({
			outline,
			drag: { type: 'slot', index: 0 },
			drop: { type: 'sectionEnd', section: 1 }
		});
		expect(toSection.committeeTemplate?.slots).toEqual([{ type: 'committeePage' }]);
		expect(toSection.sections[1].entries).toEqual([{ pageId: 'p3' }]);
	});

	test('keeps placeholders in the template and moves them there', () => {
		const out = dropInTree({
			outline,
			drag: { type: 'slot', index: 1 },
			drop: { type: 'sectionEnd', section: 1 }
		});
		expect(out).toBe(outline);
		const reordered = dropInTree({
			outline,
			drag: { type: 'slot', index: 1 },
			drop: { type: 'slot', index: 0 }
		});
		expect(reordered.committeeTemplate?.slots.map((slot) => slot.type)).toEqual([
			'committeePage',
			'page'
		]);
		const last = dropInTree({
			outline,
			drag: { type: 'slot', index: 0 },
			drop: { type: 'templateEnd' }
		});
		expect(last.committeeTemplate?.slots.map((slot) => slot.type)).toEqual([
			'committeePage',
			'page'
		]);
	});

	test('moves blocks only onto blocks', () => {
		const drag = { type: 'block', index: 0 } as const;
		expect(titles(dropInTree({ outline, drag, drop: { type: 'block', index: 1 } }))).toEqual([
			'b',
			'a',
			'c'
		]);
		expect(dropInTree({ outline, drag, drop: { type: 'sectionEnd', section: 1 } })).toBe(outline);
		expect(
			dropInTree({
				outline,
				drag: { type: 'page', pageId: 'p1' },
				drop: { type: 'block', index: 0 }
			})
		).toBe(outline);
	});

	test('ignores a template drop without a template', () => {
		const plain: Outline = { sections: outline.sections };
		expect(
			dropInTree({
				outline: plain,
				drag: { type: 'page', pageId: 'p1' },
				drop: { type: 'templateEnd' }
			})
		).toBe(plain);
	});

	function titles(value: Outline) {
		return value.sections.map((section) => section.id);
	}
});

test('withoutPage takes a page out of every section and the template', () => {
	const listed = addEntry({ outline, section: 1, pageId: 'p3' });
	const without = withoutPage({ outline: listed, pageId: 'p3' });
	expect(without.sections[1].entries).toEqual([]);
	expect(without.committeeTemplate?.slots).toEqual([{ type: 'committeePage' }]);
	expect(withoutPage({ outline: { sections: [] }, pageId: 'p3' })).toEqual({ sections: [] });
});

test('placePage puts a new page at the end of a section or the template', () => {
	expect(
		placePage({ outline, target: { type: 'section', section: 1 }, pageId: 'new' }).sections[1]
			.entries
	).toEqual([{ pageId: 'new' }]);
	expect(
		placePage({ outline, target: { type: 'template' }, pageId: 'new' }).committeeTemplate?.slots.at(
			-1
		)
	).toEqual({
		type: 'page',
		pageId: 'new'
	});
	expect(placePage({ outline, target: null, pageId: 'new' })).toBe(outline);
});
