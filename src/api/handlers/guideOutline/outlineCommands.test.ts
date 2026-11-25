import { describe, expect, test } from 'vitest';
import type { Outline } from '#lib/guide/outline';
import {
	addEntryTo,
	addSectionAt,
	changeEntry,
	changeSection,
	deleteEntry,
	deleteSection,
	draftChangedSinceSeen,
	moveBlockTo,
	moveEntryTo,
	moveSlot,
	setOverview,
	setTemplate,
	type CommandResult
} from './outlineCommands';

const outline: Outline = {
	sections: [
		{
			id: 'a',
			title: 'A',
			audience: { type: 'everyone' },
			entries: [{ pageId: 'p1' }, { pageId: 'p2', label: 'Two' }]
		},
		{ id: 'b', title: 'B', audience: { type: 'delegates' }, entries: [{ pageId: 'p3' }] }
	],
	committeeTemplate: {
		position: 1,
		titleFormat: 'COMMITTEE_NAME',
		slots: [{ type: 'committeePage' }, { type: 'page', pageId: 'p4' }, { type: 'agendaItemPages' }]
	}
};

function changed(result: CommandResult) {
	if ('missing' in result) throw new Error(`missing ${result.missing}`);
	return result.outline;
}

const titles = (result: CommandResult) => changed(result).sections.map((section) => section.title);
const pagesOf = (result: CommandResult, section: number) =>
	changed(result).sections[section].entries.map((entry) => entry.pageId);

describe('sections', () => {
	test('a new section goes last, or to a block position, and answers its id', () => {
		const last = addSectionAt({ outline, title: 'C' });
		expect(titles(last)).toEqual(['A', 'B', 'C']);
		expect('sectionId' in last && last.sectionId).toBe('section-3');

		const first = addSectionAt({
			outline,
			title: 'C',
			audience: { type: 'supervisors' },
			position: 0
		});
		expect(titles(first)).toEqual(['C', 'A', 'B']);
		// the template keeps standing before B
		expect(changed(first).committeeTemplate?.position).toBe(2);
		expect(changed(first).sections[0].audience).toEqual({ type: 'supervisors' });
	});

	test('changing a section touches only what is given', () => {
		const renamed = changed(changeSection({ outline, sectionId: 'b', title: 'Bee' }));
		expect(renamed.sections[1]).toMatchObject({ title: 'Bee', audience: { type: 'delegates' } });
		const opened = changed(
			changeSection({ outline, sectionId: 'b', audience: { type: 'everyone' } })
		);
		expect(opened.sections[1]).toMatchObject({ title: 'B', audience: { type: 'everyone' } });
		expect(changeSection({ outline, sectionId: 'x', title: 'X' })).toEqual({ missing: 'section' });
	});

	test('removing a section keeps the template among the rest', () => {
		const result = changed(deleteSection({ outline, sectionId: 'a' }));
		expect(result.sections.map((section) => section.id)).toEqual(['b']);
		expect(result.committeeTemplate?.position).toBe(0);
		expect(deleteSection({ outline, sectionId: 'x' })).toEqual({ missing: 'section' });
	});

	test('sections and the template move as blocks', () => {
		const templateFirst = changed(moveBlockTo({ outline, block: 'template', position: 0 }));
		expect(templateFirst.committeeTemplate?.position).toBe(0);
		const bFirst = moveBlockTo({ outline, block: { sectionId: 'b' }, position: -3 });
		expect(titles(bFirst)).toEqual(['B', 'A']);
		const aLast = moveBlockTo({ outline, block: { sectionId: 'a' }, position: 99 });
		expect(titles(aLast)).toEqual(['B', 'A']);
		expect(changed(aLast).committeeTemplate?.position).toBe(0);
		expect(moveBlockTo({ outline: { sections: [] }, block: 'template', position: 0 })).toEqual({
			missing: 'template'
		});
	});
});

describe('entries', () => {
	test('added at the end or before a position, with label and audience', () => {
		expect(pagesOf(addEntryTo({ outline, sectionId: 'a', pageId: 'p5' }), 0)).toEqual([
			'p1',
			'p2',
			'p5'
		]);
		const placed = changed(
			addEntryTo({
				outline,
				sectionId: 'a',
				pageId: 'p5',
				position: 1,
				label: 'Five',
				audience: { type: 'supervisors' }
			})
		);
		expect(placed.sections[0].entries[1]).toEqual({
			pageId: 'p5',
			label: 'Five',
			audience: { type: 'supervisors' }
		});
		expect(addEntryTo({ outline, sectionId: 'x', pageId: 'p5' })).toEqual({ missing: 'section' });
	});

	test('changed by section and page; null clears label and audience', () => {
		const labelled = changed(
			changeEntry({
				outline,
				sectionId: 'a',
				pageId: 'p1',
				label: 'One',
				audience: { type: 'delegates' }
			})
		);
		expect(labelled.sections[0].entries[0]).toEqual({
			pageId: 'p1',
			label: 'One',
			audience: { type: 'delegates' }
		});
		const cleared = changed(
			changeEntry({ outline: labelled, sectionId: 'a', pageId: 'p1', label: null, audience: null })
		);
		expect(cleared.sections[0].entries[0]).toEqual({ pageId: 'p1' });
		const kept = changed(changeEntry({ outline, sectionId: 'a', pageId: 'p2' }));
		expect(kept.sections[0].entries[1]).toEqual({ pageId: 'p2', label: 'Two' });
		expect(changeEntry({ outline, sectionId: 'a', pageId: 'p3', label: 'x' })).toEqual({
			missing: 'entry'
		});
	});

	test('removed by section and page', () => {
		expect(pagesOf(deleteEntry({ outline, sectionId: 'a', pageId: 'p1' }), 0)).toEqual(['p2']);
		expect(deleteEntry({ outline, sectionId: 'b', pageId: 'p1' })).toEqual({ missing: 'entry' });
	});

	test('moved within a section, into another, or into the template', () => {
		const down = moveEntryTo({
			outline,
			from: { sectionId: 'a', pageId: 'p1' },
			to: { block: { sectionId: 'a' } }
		});
		expect(pagesOf(down, 0)).toEqual(['p2', 'p1']);

		const across = moveEntryTo({
			outline,
			from: { sectionId: 'a', pageId: 'p2' },
			to: { block: { sectionId: 'b' }, position: 0 }
		});
		expect(pagesOf(across, 0)).toEqual(['p1']);
		expect(changed(across).sections[1].entries).toEqual([
			{ pageId: 'p2', label: 'Two' },
			{ pageId: 'p3' }
		]);

		const intoTemplate = changed(
			moveEntryTo({
				outline,
				from: { sectionId: 'a', pageId: 'p2' },
				to: { block: 'template', position: 1 }
			})
		);
		expect(intoTemplate.committeeTemplate?.slots).toEqual([
			{ type: 'committeePage' },
			{ type: 'page', pageId: 'p2', label: 'Two' },
			{ type: 'page', pageId: 'p4' },
			{ type: 'agendaItemPages' }
		]);
		const atTheEnd = changed(
			moveEntryTo({ outline, from: { sectionId: 'b', pageId: 'p3' }, to: { block: 'template' } })
		);
		expect(atTheEnd.committeeTemplate?.slots.at(-1)).toEqual({ type: 'page', pageId: 'p3' });

		expect(
			moveEntryTo({
				outline: { sections: outline.sections },
				from: { sectionId: 'a', pageId: 'p1' },
				to: { block: 'template' }
			})
		).toEqual({ missing: 'template' });
		expect(
			moveEntryTo({
				outline,
				from: { sectionId: 'a', pageId: 'p1' },
				to: { block: { sectionId: 'x' } }
			})
		).toEqual({ missing: 'section' });
	});
});

describe('the committee template', () => {
	test('switched off, on with its default slots, or on with slots given', () => {
		expect(changed(setTemplate({ outline, enabled: false })).committeeTemplate).toBeUndefined();
		const plain = { sections: outline.sections };
		expect(
			changed(setTemplate({ outline: plain, enabled: true })).committeeTemplate?.slots
		).toEqual([{ type: 'committeePage' }, { type: 'agendaItemPages' }]);
		const slots = [{ type: 'page' as const, pageId: 'p1' }];
		expect(changed(setTemplate({ outline, enabled: true, slots })).committeeTemplate).toEqual({
			...outline.committeeTemplate,
			slots
		});
	});

	test('slots move by index', () => {
		const moved = changed(moveSlot({ outline, from: 2, to: 0 }));
		expect(moved.committeeTemplate?.slots.map((slot) => slot.type)).toEqual([
			'agendaItemPages',
			'committeePage',
			'page'
		]);
		const last = changed(moveSlot({ outline, from: 0, to: 9 }));
		expect(last.committeeTemplate?.slots[2]).toEqual({ type: 'committeePage' });
		expect(moveSlot({ outline, from: 5, to: 0 })).toEqual({ missing: 'slot' });
		expect(moveSlot({ outline: { sections: [] }, from: 0, to: 1 })).toEqual({
			missing: 'template'
		});
	});
});

test('a draft counts as moved on when its stamp is not the one seen', () => {
	const seen = new Date('2026-01-01T00:00:00.000Z');
	expect(draftChangedSinceSeen({ stored: new Date(seen), expected: seen })).toBe(false);
	expect(draftChangedSinceSeen({ stored: new Date(seen.getTime() + 1), expected: seen })).toBe(
		true
	);
	// a stamp of a draft that is not there
	expect(draftChangedSinceSeen({ stored: undefined, expected: seen })).toBe(true);
	// nothing named: nothing checked
	expect(draftChangedSinceSeen({ stored: new Date(), expected: undefined })).toBe(false);
	expect(draftChangedSinceSeen({ stored: undefined, expected: null })).toBe(false);
});

describe('the topic overview', () => {
	test('switched on with a title and readers, changed, moved and switched off', () => {
		const on = changed(
			setOverview({
				outline,
				enabled: true,
				defaultTitle: 'Themen aller Gremien',
				readers: { roleIds: ['press'] }
			})
		);
		expect(on.topicOverview).toEqual({
			position: 3,
			title: 'Themen aller Gremien',
			readers: { nonStateActors: true, supervisors: true, roleIds: ['press'] }
		});
		const renamed = changed(
			setOverview({ outline: on, enabled: true, title: 'Topics', defaultTitle: 'x' })
		);
		expect(renamed.topicOverview?.title).toBe('Topics');
		expect(renamed.topicOverview?.readers.roleIds).toEqual(['press']);
		const first = changed(moveBlockTo({ outline: on, block: 'topics', position: 0 }));
		expect(first.topicOverview?.position).toBe(0);
		expect(first.committeeTemplate?.position).toBe(2);
		expect(
			changed(setOverview({ outline: on, enabled: false, defaultTitle: 'x' })).topicOverview
		).toBeUndefined();
		expect(moveBlockTo({ outline, block: 'topics', position: 0 })).toEqual({ missing: 'topics' });
	});
});
