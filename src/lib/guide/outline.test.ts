import { describe, expect, test } from 'vitest';
import {
	expandOutline,
	guideForReader,
	locateEntry,
	outlinePageIds,
	outlineRoleIds,
	outlineSchema,
	parseOutline,
	withAvailablePages,
	type GuideReader,
	type Outline
} from './outline';

const outline: Outline = {
	sections: [
		{
			id: 'start',
			title: 'Los geht es',
			audience: { type: 'everyone' },
			entries: [{ pageId: 'welcome' }, { pageId: 'supervisors', audience: { type: 'supervisors' } }]
		},
		{
			id: 'nsa',
			title: 'Als NA',
			audience: { type: 'nonStateActors' },
			entries: [{ pageId: 'nsa-steps' }]
		},
		{
			id: 'press',
			title: 'Presse',
			audience: { type: 'customRoles', roleIds: ['press'] },
			entries: [{ pageId: 'press-steps' }]
		},
		{
			id: 'abc',
			title: 'Begriffe',
			audience: { type: 'everyone' },
			entries: [{ pageId: 'un-abc', label: 'UN-ABC' }]
		}
	],
	committeeTemplate: {
		position: 1,
		titleFormat: 'COMMITTEE_NAME',
		slots: [
			{ type: 'page', pageId: 'why' },
			{ type: 'committeePage', label: 'Schritt 3' },
			{ type: 'agendaItemPages' },
			{ type: 'page', pageId: 'paper' }
		]
	}
};

const committees = [
	{ id: 'ga', name: 'Generalversammlung', pageId: 'ga-page', agendaItemPageIds: ['ga-1', 'ga-2'] },
	{ id: 'sc', name: 'Sicherheitsrat', pageId: null, agendaItemPageIds: [] }
];

const sections = expandOutline({ outline, committees });

describe('expandOutline', () => {
	test('puts one section per committee at the template position', () => {
		expect(sections.map((section) => section.title)).toEqual([
			'Los geht es',
			'Generalversammlung',
			'Sicherheitsrat',
			'Als NA',
			'Presse',
			'Begriffe'
		]);
	});

	test('fills the slots with the committee page and its agenda items, indented', () => {
		const ga = sections[1];
		expect(ga.entries.map((entry) => [entry.pageId, entry.indent, entry.label])).toEqual([
			['why', 0, null],
			['ga-page', 0, 'Schritt 3'],
			['ga-1', 1, null],
			['ga-2', 1, null],
			['paper', 0, null]
		]);
		expect(ga.audience).toEqual({ type: 'committee', committeeId: 'ga' });
	});

	test('skips the committee page slot for a committee without a page', () => {
		expect(sections[2].entries.map((entry) => entry.pageId)).toEqual(['why', 'paper']);
	});

	test('gives a shared page a different key in every section', () => {
		const keys = sections.flatMap((section) => section.entries).map((entry) => entry.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('guideForReader', () => {
	const titlesFor = (reader: GuideReader) =>
		guideForReader({ sections, reader }).map((section) => section.title);

	test('a delegate sees their committee and what is for everyone', () => {
		expect(titlesFor({ kind: 'delegate', committeeId: 'sc', nonStateActor: false })).toEqual([
			'Los geht es',
			'Sicherheitsrat',
			'Begriffe'
		]);
	});

	test('a non-state actor sees the NSA section, no committee', () => {
		expect(titlesFor({ kind: 'delegate', committeeId: null, nonStateActor: true })).toEqual([
			'Los geht es',
			'Als NA',
			'Begriffe'
		]);
	});

	test('a custom role sees its section', () => {
		expect(titlesFor({ kind: 'singleParticipant', roleId: 'press' })).toEqual([
			'Los geht es',
			'Presse',
			'Begriffe'
		]);
		expect(titlesFor({ kind: 'singleParticipant', roleId: 'judge' })).toEqual([
			'Los geht es',
			'Begriffe'
		]);
	});

	test('supervisors and the team see everything, supervisor entries only they', () => {
		expect(titlesFor({ kind: 'supervisor' })).toHaveLength(6);
		expect(titlesFor({ kind: 'everything' })).toHaveLength(6);
		const delegate = guideForReader({
			sections,
			reader: { kind: 'delegate', committeeId: 'ga', nonStateActor: false }
		});
		expect(delegate[0].entries.map((entry) => entry.pageId)).toEqual(['welcome']);
	});
});

test('withAvailablePages drops unpublished pages and empty sections', () => {
	const available = withAvailablePages({ sections, isAvailable: (id) => id === 'welcome' });
	expect(available.map((section) => section.entries.map((entry) => entry.pageId))).toEqual([
		['welcome']
	]);
});

describe('locateEntry', () => {
	test('finds the previous and next entry across sections', () => {
		const found = locateEntry({ sections, pageId: 'ga-page' });
		expect(found?.previous?.pageId).toBe('why');
		expect(found?.next?.pageId).toBe('ga-1');
		const first = locateEntry({ sections, pageId: 'welcome' });
		expect(first?.previous).toBeNull();
	});

	test('a key picks one of several entries of a shared page', () => {
		const sc = sections[2].entries[0];
		const found = locateEntry({ sections, pageId: 'why', key: sc.key });
		expect(found?.section.title).toBe('Sicherheitsrat');
		expect(locateEntry({ sections, pageId: 'why' })?.section.title).toBe('Generalversammlung');
		expect(locateEntry({ sections, pageId: 'missing' })).toBeUndefined();
	});
});

test('outlinePageIds and outlineRoleIds list what an outline names', () => {
	expect(outlinePageIds(outline).sort()).toEqual(
		['abc', 'welcome', 'supervisors', 'nsa-steps', 'press-steps', 'un-abc', 'why', 'paper']
			.filter((id) => id !== 'abc')
			.sort()
	);
	expect(outlineRoleIds(outline)).toEqual(['press']);
});

test('parseOutline refuses broken documents', () => {
	expect(parseOutline({ sections: [{ id: 'x' }] })).toEqual({ sections: [] });
	expect(outlineSchema.safeParse(outline).success).toBe(true);
	expect(
		outlineSchema.safeParse({
			sections: [{ id: 's', title: 's', audience: { type: 'all' }, entries: [] }]
		}).success
	).toBe(false);
});

describe('the topic overview', () => {
	const withTopics: Outline = {
		...outline,
		topicOverview: {
			// after the template and before "Begriffe": blocks start, template, nsa, press, topics, abc
			position: 4,
			title: 'Themen aller Gremien',
			readers: { nonStateActors: true, supervisors: false, roleIds: ['press'] }
		}
	};
	const topicCommittees = [
		...committees,
		{ id: 'hrc', name: 'Menschenrechtsrat', pageId: null, agendaItemPageIds: ['hrc-1'] }
	];
	const expanded = expandOutline({ outline: withTopics, committees: topicCommittees });
	const titlesFor = (reader: GuideReader) =>
		guideForReader({ sections: expanded, reader }).map((section) => section.title);

	test('stands at its block position with every committee page and its topics', () => {
		expect(expanded.map((section) => section.title)).toEqual([
			'Los geht es',
			'Generalversammlung',
			'Sicherheitsrat',
			'Menschenrechtsrat',
			'Als NA',
			'Presse',
			'Themen aller Gremien',
			'Begriffe'
		]);
		const topics = expanded.find((section) => section.key === 'topics');
		expect(
			topics?.entries.map(({ pageId, label, indent, committeeId }) => ({
				pageId,
				label,
				indent,
				committeeId
			}))
		).toEqual([
			// the committee page, named after the committee, its topics beneath
			{ pageId: 'ga-page', label: 'Generalversammlung', indent: 0, committeeId: 'ga' },
			{ pageId: 'ga-1', label: null, indent: 1, committeeId: 'ga' },
			{ pageId: 'ga-2', label: null, indent: 1, committeeId: 'ga' },
			// no committee page: its topics stand on their own; no pages at all: nothing
			{ pageId: 'hrc-1', label: null, indent: 0, committeeId: 'hrc' }
		]);
	});

	test('is for the readers it names; never for delegates, supervisors only when ticked', () => {
		const delegate: GuideReader = { kind: 'delegate', committeeId: 'ga', nonStateActor: false };
		expect(titlesFor(delegate)).not.toContain('Themen aller Gremien');
		expect(titlesFor({ kind: 'delegate', committeeId: null, nonStateActor: true })).toContain(
			'Themen aller Gremien'
		);
		expect(titlesFor({ kind: 'singleParticipant', roleId: 'press' })).toContain(
			'Themen aller Gremien'
		);
		expect(titlesFor({ kind: 'singleParticipant', roleId: 'judge' })).not.toContain(
			'Themen aller Gremien'
		);
		// supervisors keep the committee sections, and get the overview only when ticked
		expect(titlesFor({ kind: 'supervisor' })).toContain('Generalversammlung');
		expect(titlesFor({ kind: 'supervisor' })).not.toContain('Themen aller Gremien');
		const forSupervisors = expandOutline({
			outline: {
				...withTopics,
				topicOverview: {
					position: 4,
					title: 'Themen aller Gremien',
					readers: { nonStateActors: false, supervisors: true, roleIds: [] }
				}
			},
			committees: topicCommittees
		});
		expect(
			guideForReader({ sections: forSupervisors, reader: { kind: 'supervisor' } }).map(
				(section) => section.title
			)
		).toContain('Themen aller Gremien');
		expect(titlesFor({ kind: 'everything' })).toContain('Themen aller Gremien');
	});

	test('its roles count among the outline’s roles', () => {
		expect(
			outlineRoleIds({
				sections: [],
				topicOverview: {
					position: 0,
					title: 'T',
					readers: { nonStateActors: false, supervisors: false, roleIds: ['judge'] }
				}
			})
		).toEqual(['judge']);
	});
});
