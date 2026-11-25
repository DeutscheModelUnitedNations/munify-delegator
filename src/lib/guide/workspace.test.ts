import { describe, expect, test } from 'vitest';
import type { Outline } from './outline';
import {
	committeeMatrix,
	committeeProgress,
	groupSees,
	outlineChanged,
	pagesOutsideOutline,
	pendingPages,
	readerOf,
	rowIsOpen,
	templateCommittees,
	visibilityRows,
	type ReaderGroup,
	type WorkspacePage
} from './workspace';

const pages: WorkspacePage[] = [
	{ id: 'welcome', title: 'Willkommen', kind: 'GENERAL', state: 'PUBLISHED' },
	{ id: 'abc', title: 'UN-ABC', kind: 'GENERAL', state: 'CHANGED' },
	{ id: 'docs', title: 'Dokumente', kind: 'GENERAL', state: 'DRAFT' },
	{ id: 'role', title: 'Meine Rolle', kind: 'GENERAL', state: 'PUBLISHED' },
	{
		id: 'sr',
		title: 'Der Sicherheitsrat',
		kind: 'COMMITTEE',
		state: 'CHANGED',
		committeeId: 'c-sr'
	},
	{ id: 'sr1', title: 'SR TOP 1', kind: 'AGENDA_ITEM', state: 'DRAFT', agendaItemId: 'a-sr1' }
];

const outline: Outline = {
	sections: [
		{
			id: 'start',
			title: 'Einstieg',
			audience: { type: 'everyone' },
			entries: [
				{ pageId: 'welcome' },
				{ pageId: 'abc', audience: { type: 'customRoles', roleIds: ['press'] } }
			]
		},
		{ id: 'na', title: 'NA', audience: { type: 'nonStateActors' }, entries: [] }
	],
	committeeTemplate: {
		position: 1,
		titleFormat: 'COMMITTEE_NAME',
		slots: [
			{ type: 'page', pageId: 'role', label: 'Rolle' },
			{ type: 'committeePage' },
			{ type: 'agendaItemPages' }
		]
	}
};

test('pages outside the outline are the general pages it does not name', () => {
	expect(pagesOutsideOutline({ outline, pages, locale: 'de' }).map((page) => page.id)).toEqual([
		'docs'
	]);
});

describe('outlineChanged', () => {
	test('compares by content, not key order', () => {
		const reordered = JSON.parse(JSON.stringify(outline));
		expect(outlineChanged({ draft: outline, published: reordered })).toBe(false);
		expect(outlineChanged({ draft: { sections: [] }, published: outline })).toBe(true);
	});

	test('an unpublished outline is always a change', () => {
		expect(outlineChanged({ draft: { sections: [] }, published: null })).toBe(true);
	});
});

test('pending pages are those the guide uses and that are not published as they stand', () => {
	expect(pendingPages({ outline, pages, locale: 'de' }).map((page) => page.id)).toEqual([
		'sr',
		'sr1',
		'abc'
	]);
	const plain: Outline = { sections: outline.sections };
	expect(pendingPages({ outline: plain, pages, locale: 'de' }).map((page) => page.id)).toEqual([
		'abc'
	]);
});

describe('committeeMatrix', () => {
	const committees = [
		{
			id: 'c-sr',
			name: 'Sicherheitsrat',
			abbreviation: 'SR',
			agendaItems: [
				{ id: 'a-sr1', title: 'Cyber' },
				{ id: 'a-sr2', title: 'Sahel' }
			]
		},
		{
			id: 'c-gv',
			name: 'Generalversammlung',
			abbreviation: 'GV',
			agendaItems: [{ id: 'a-gv1', title: 'Klima' }]
		}
	];

	test('lays the template out as rows of shared pages and per-committee cells', () => {
		const rows = committeeMatrix({ slots: outline.committeeTemplate?.slots, committees, pages });
		expect(rows.map((row) => row.kind)).toEqual([
			'shared',
			'committeePage',
			'agendaItem',
			'agendaItem'
		]);
		const [shared, own, first, second] = rows;
		expect(shared).toMatchObject({ label: 'Rolle', page: { id: 'role', state: 'PUBLISHED' } });
		expect(own.kind === 'committeePage' && own.cells).toEqual([
			{ kind: 'page', pageId: 'sr', title: 'Der Sicherheitsrat', state: 'CHANGED' },
			{ kind: 'missing', owner: { committeeId: 'c-gv' }, title: 'Generalversammlung' }
		]);
		expect(first.kind === 'agendaItem' && first.cells.map((cell) => cell.kind)).toEqual([
			'page',
			'missing'
		]);
		expect(second.kind === 'agendaItem' && second.cells.map((cell) => cell.kind)).toEqual([
			'missing',
			'none'
		]);
	});

	test('without a template shows the committee and agenda item pages', () => {
		const rows = committeeMatrix({ slots: undefined, committees, pages });
		expect(rows.map((row) => row.kind)).toEqual(['committeePage', 'agendaItem', 'agendaItem']);
	});

	test('a shared slot whose page is gone has no page', () => {
		const rows = committeeMatrix({ slots: [{ type: 'page', pageId: 'gone' }], committees, pages });
		expect(rows).toEqual([{ kind: 'shared', key: 'page-0', label: null, page: null }]);
	});

	test('a row is open while a page is missing or not published as it stands', () => {
		const rows = committeeMatrix({ slots: outline.committeeTemplate?.slots, committees, pages });
		expect(rows.map(rowIsOpen)).toEqual([false, true, true, true]);
		expect(rowIsOpen({ kind: 'shared', key: 'x', label: null, page: null })).toBe(true);
		expect(
			rowIsOpen({
				kind: 'agendaItem',
				key: 'y',
				number: 1,
				cells: [{ kind: 'none' }, { kind: 'page', pageId: 'p', title: 'P', state: 'PUBLISHED' }]
			})
		).toBe(false);
	});

	test('counts each committee’s published own pages', () => {
		const rows = committeeMatrix({ slots: undefined, committees, pages });
		expect(committeeProgress(rows, 2)).toEqual([
			{ published: 0, total: 3 },
			{ published: 0, total: 2 }
		]);
	});
});

describe('visibility', () => {
	const groups: ReaderGroup[] = [
		{ type: 'delegates' },
		{ type: 'nonStateActors' },
		{ type: 'customRole', roleId: 'press' },
		{ type: 'supervisors' }
	];

	test('groupSees follows the audience; supervisors see everything', () => {
		expect(groupSees({ audience: { type: 'supervisors' }, group: { type: 'delegates' } })).toBe(
			false
		);
		expect(groupSees({ audience: { type: 'delegates' }, group: { type: 'supervisors' } })).toBe(
			true
		);
		expect(
			groupSees({
				audience: { type: 'customRoles', roleIds: ['press'] },
				group: { type: 'customRole', roleId: 'judge' }
			})
		).toBe(false);
	});

	test('rows per section, the template and entries with their own audience', () => {
		const rows = visibilityRows({
			outline,
			groups,
			titles: { template: 'Vorlage', page: (pageId) => `Seite ${pageId}` }
		});
		expect(rows.map((row) => [row.kind, row.title, row.section, row.cells])).toEqual([
			['section', 'Einstieg', 0, ['some', 'some', 'all', 'all']],
			['entry', 'Seite abc', 0, ['none', 'none', 'all', 'all']],
			['template', 'Vorlage', null, ['own', 'none', 'none', 'all']],
			['section', 'NA', 1, ['none', 'all', 'none', 'all']]
		]);
	});
});

test('readerOf previews each group as a reader', () => {
	expect(readerOf({ group: { type: 'delegates' }, committeeId: 'c-sr' })).toEqual({
		kind: 'delegate',
		committeeId: 'c-sr',
		nonStateActor: false
	});
	expect(readerOf({ group: { type: 'nonStateActors' }, committeeId: 'c-sr' })).toEqual({
		kind: 'delegate',
		committeeId: null,
		nonStateActor: true
	});
	expect(readerOf({ group: { type: 'customRole', roleId: 'press' }, committeeId: null })).toEqual({
		kind: 'singleParticipant',
		roleId: 'press'
	});
	expect(readerOf({ group: { type: 'supervisors' }, committeeId: null })).toEqual({
		kind: 'supervisor'
	});
});

test('templateCommittees finds each committee’s pages', () => {
	expect(
		templateCommittees({
			committees: [
				{
					id: 'c-sr',
					name: 'Sicherheitsrat',
					abbreviation: 'SR',
					agendaItems: [
						{ id: 'a-sr1', title: 'Cyber' },
						{ id: 'a-sr2', title: 'Sahel' }
					]
				},
				{ id: 'c-gv', name: 'GV', abbreviation: 'GV', agendaItems: [] }
			],
			pages
		})
	).toEqual([
		{ id: 'c-sr', name: 'Sicherheitsrat', pageId: 'sr', agendaItemPageIds: ['sr1'] },
		{ id: 'c-gv', name: 'GV', pageId: null, agendaItemPageIds: [] }
	]);
});

describe('the topic overview in the workspace', () => {
	const withTopics: Outline = {
		sections: [outline.sections[0]],
		topicOverview: {
			position: 1,
			title: 'Themen',
			readers: { nonStateActors: true, supervisors: false, roleIds: ['press'] }
		}
	};

	test('is one visibility row: never delegates, the groups it names', () => {
		const rows = visibilityRows({
			outline: withTopics,
			groups: [
				{ type: 'delegates' },
				{ type: 'nonStateActors' },
				{ type: 'customRole', roleId: 'press' },
				{ type: 'customRole', roleId: 'judge' },
				{ type: 'supervisors' }
			],
			titles: { template: 'Vorlage', page: (pageId) => pageId }
		});
		expect(rows.at(-1)).toEqual({
			kind: 'topics',
			key: 'topics',
			title: 'Themen',
			section: null,
			cells: ['none', 'all', 'all', 'none', 'none']
		});
	});

	test('makes the committee and agenda item pages pending', () => {
		expect(
			pendingPages({ outline: withTopics, pages, locale: 'de' }).map((page) => page.id)
		).toEqual(['sr', 'sr1', 'abc']);
	});
});
