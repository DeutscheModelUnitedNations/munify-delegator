import { beforeEach, describe, expect, test } from 'vitest';
import { overwriteGetLocale } from '#lib/paraglide/runtime';
import { rowActions, rowBadges, rowFacts, rowView, type RowFacts } from './announcementRowView';

const row: RowFacts = {
	importance: 'NORMAL',
	pinned: false,
	notifyByMail: false,
	publishAt: null,
	visibleUntil: null,
	editedAt: null,
	recipientCount: 12,
	readCount: 5,
	author: { givenName: 'Ada', familyName: 'Lovelace' },
	publishedBy: { givenName: 'Ben', familyName: 'Test' }
};
const dateTime = (value: Date | string) => `<${new Date(value).toISOString().slice(0, 10)}>`;
const keys = (list: { key: string }[]) => list.map((entry) => entry.key);

beforeEach(() => overwriteGetLocale(() => 'de'));

describe('rowBadges', () => {
	test('a plain announcement has none', () => {
		expect(rowBadges(row)).toEqual([]);
	});

	test('how loud it is comes first, then pinned and mail', () => {
		expect(
			keys(rowBadges({ ...row, importance: 'URGENT', pinned: true, notifyByMail: true }))
		).toEqual(['urgent', 'pinned', 'mail']);
		expect(keys(rowBadges({ ...row, importance: 'IMPORTANT' }))).toEqual(['important']);
	});
});

describe('rowFacts', () => {
	test('a draft says whom it would reach and who wrote it, not who published it before', () => {
		const facts = rowFacts({ row, state: 'DRAFT', dateTime });
		expect(keys(facts)).toEqual(['reach', 'author']);
		expect(facts[0].text).toContain('12');
		expect(facts[0].text).not.toContain('5');
		expect(facts[1].text).toContain('Ada Lovelace');
	});

	test('one that is out says when it went out, how many read it and who published it', () => {
		const facts = rowFacts({
			row: { ...row, publishAt: '2027-03-01T08:00:00Z', editedAt: '2027-03-02T08:00:00Z' },
			state: 'PUBLISHED',
			dateTime
		});
		expect(keys(facts)).toEqual(['publishAt', 'editedAt', 'reach', 'author', 'publishedBy']);
		expect(facts[0].text).toContain('<2027-03-01>');
		expect(facts[2].text).toMatch(/5.*12/);
		expect(facts[4].text).toContain('Ben Test');
	});

	test('a scheduled one names its time as ahead, and an end is listed', () => {
		const scheduled = {
			...row,
			publishAt: '2027-03-01T08:00:00Z',
			visibleUntil: '2027-03-05T08:00:00Z'
		};
		const facts = rowFacts({ row: scheduled, state: 'SCHEDULED', dateTime });
		const published = rowFacts({ row: scheduled, state: 'PUBLISHED', dateTime });
		expect(keys(facts).slice(0, 2)).toEqual(['publishAt', 'visibleUntil']);
		expect(facts[0].text).not.toBe(published[0].text);
		expect(facts[1].text).toContain('<2027-03-05>');
	});

	test('nobody is named when the accounts are gone', () => {
		const facts = rowFacts({
			row: { ...row, author: null, publishedBy: undefined },
			state: 'EXPIRED',
			dateTime
		});
		expect(keys(facts)).toEqual(['reach']);
	});
});

describe('rowActions', () => {
	const actionsOf = (state: Parameters<typeof rowActions>[0]['state'], mail = false) =>
		rowActions({ row: { ...row, notifyByMail: mail }, state }).map(({ action }) => action);

	test('a draft is published, not taken back', () => {
		expect(actionsOf('DRAFT')).toEqual([
			'edit',
			'publish',
			'test-mail',
			'duplicate',
			'archive',
			'delete'
		]);
	});

	test('one that is out is taken back, and notified again only with a mail', () => {
		expect(actionsOf('PUBLISHED')).toEqual([
			'edit',
			'withdraw',
			'test-mail',
			'duplicate',
			'archive',
			'delete'
		]);
		expect(actionsOf('PUBLISHED', true)).toContain('renotify');
		expect(actionsOf('SCHEDULED', true)).not.toContain('renotify');
		expect(actionsOf('EXPIRED')).toContain('withdraw');
	});

	test('an archived one is published again and not archived twice', () => {
		expect(actionsOf('ARCHIVED')).toEqual(['edit', 'publish', 'test-mail', 'duplicate', 'delete']);
	});

	test('every button has a label and an icon', () => {
		for (const button of rowActions({ row, state: 'PUBLISHED' })) {
			expect(button.label).not.toBe('');
			expect(button.icon).toMatch(/^ph-/);
		}
	});
});

describe('rowView', () => {
	const lookups = {
		committees: new Map([['c1', 'GV']]),
		roles: new Map(),
		surveyOptions: new Map()
	};
	const listed = {
		...row,
		id: 'a1',
		title: 'Raumwechsel',
		state: 'PUBLISHED',
		audiences: [{ id: 'au1', kind: 'COMMITTEE' as const, committeeId: 'c1' }]
	};

	test('is everything a row shows, as plain values', () => {
		const view = rowView({ row: listed, lookups, dateTime });
		expect(view).toMatchObject({ id: 'a1', title: 'Raumwechsel', state: 'PUBLISHED' });
		expect(view.audiences).toEqual([{ id: 'au1', label: expect.stringContaining('GV') }]);
		expect(view.actions.map(({ action }) => action)).toContain('withdraw');
		expect(view.facts.map(({ key }) => key)).toContain('reach');
		// nothing in it refers back to the row it was read from
		expect(structuredClone(view)).toEqual(view);
	});

	test('a state the page does not know shows as a draft', () => {
		expect(rowView({ row: { ...listed, state: 'NEW_STATE' }, lookups, dateTime }).state).toBe(
			'DRAFT'
		);
	});
});
