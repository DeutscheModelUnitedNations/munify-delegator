import { describe, expect, test } from 'vitest';
import { resolve } from '$app/paths';
import { m } from '$lib/paraglide/messages';
import {
	describeItem,
	describeTransaction,
	flattenResults,
	participationTypeLabel,
	resultTarget,
	searchHint,
	steppedIndex,
	type ResultItem
} from './commandPaletteItems';
import type { ConfigEntry, PageEntry } from './pageRegistry';

const conferenceId = 'conf-1';
const user = {
	id: 'u1',
	email: 'a@b.c',
	givenName: 'Ada',
	familyName: 'Lovelace',
	participationType: 'single'
};
const delegation = {
	id: 'd1',
	school: 'Gym',
	entryCode: 'ABC',
	memberCount: 3,
	headDelegateUserId: 'u9'
};
const transaction = { id: 't1', amount: 10, currency: 'EUR', recievedAt: null };
const page: PageEntry = {
	id: 'stats',
	title: () => 'Stats',
	icon: 'fa-chart-pie',
	href: resolve('/(authenticated)/dashboard/[conferenceId]/management/stats', { conferenceId }),
	category: 'management',
	keywords: []
};
const config: ConfigEntry = {
	id: 'c',
	title: () => 'Title',
	section: () => 'Section',
	icon: 'fa-gears',
	tab: 'general',
	keywords: []
};
const foreignUser = { id: 'f1', email: 'f@b.c', givenName: 'Fo', familyName: 'Reign' };

describe('flattenResults', () => {
	test('orders the groups', () => {
		const items = flattenResults({
			users: [user],
			delegations: [delegation],
			transactions: [transaction],
			pages: [page],
			configs: [config],
			foreignUsers: [foreignUser]
		});
		expect(items.map((i) => i.type)).toEqual([
			'user',
			'delegation',
			'transaction',
			'page',
			'config',
			'foreignUser'
		]);
	});
});

describe('resultTarget', () => {
	test('users open their card', () => {
		expect(resultTarget({ type: 'user', data: user }, conferenceId)).toEqual({ userId: 'u1' });
		expect(resultTarget({ type: 'foreignUser', data: foreignUser }, conferenceId)).toEqual({
			userId: 'f1'
		});
	});
	test('a delegation opens its head delegate, or the filtered list', () => {
		expect(resultTarget({ type: 'delegation', data: delegation }, conferenceId)).toEqual({
			userId: 'u9'
		});
		const target = resultTarget(
			{ type: 'delegation', data: { ...delegation, headDelegateUserId: null } },
			conferenceId
		);
		expect(target).toHaveProperty(
			'href',
			expect.stringContaining('/conf-1/management/delegations?filter=ABC')
		);
	});
	test('pages, configuration and transactions navigate', () => {
		expect(resultTarget({ type: 'page', data: page }, conferenceId)).toEqual({ href: page.href });
		expect(resultTarget({ type: 'config', data: config }, conferenceId)).toHaveProperty(
			'href',
			expect.stringContaining('/conf-1/management/configuration?tab=general')
		);
		expect(resultTarget({ type: 'transaction', data: transaction }, conferenceId)).toHaveProperty(
			'href',
			expect.stringContaining('/conf-1/management/payments?searchValue=t1')
		);
	});
});

describe('steppedIndex', () => {
	test('moves and clamps', () => {
		expect(steppedIndex('ArrowDown', 0, 3)).toBe(1);
		expect(steppedIndex('ArrowDown', 2, 3)).toBe(2);
		expect(steppedIndex('ArrowUp', 2, 3)).toBe(1);
		expect(steppedIndex('ArrowUp', 0, 3)).toBe(0);
	});
	test('nothing to move', () => {
		expect(steppedIndex('ArrowDown', 0, 0)).toBeUndefined();
		expect(steppedIndex('Enter', 0, 3)).toBeUndefined();
	});
});

describe('participationTypeLabel', () => {
	test.each([
		['delegation', m.delegationMember()],
		['single', m.singleParticipant()],
		['supervisor', m.supervisor()],
		['team', m.teamMember()],
		['other', 'other']
	])('%s', (type, label) => {
		expect(participationTypeLabel(type)).toBe(label);
	});
});

describe('describeTransaction', () => {
	test('not yet received', () => {
		expect(describeTransaction(transaction)).toBe(
			m.commandPalettePaymentNotReceived({ amount: 10, currency: 'EUR' })
		);
	});
	test('received, with its date', () => {
		const recievedAt = '2026-03-04T00:00:00.000Z';
		const text = describeTransaction({ ...transaction, recievedAt });
		expect(text).toBe(
			m.commandPalettePaymentReceived({
				amount: 10,
				currency: 'EUR',
				date: new Date(recievedAt).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			})
		);
	});
});

describe('describeItem', () => {
	const cases: [ResultItem, { icon: string; primary: string; secondary?: string }][] = [
		[
			{ type: 'user', data: user },
			{ icon: 'fa-user', primary: 'Ada Lovelace', secondary: `a@b.c · ${m.singleParticipant()}` }
		],
		[
			{ type: 'delegation', data: delegation },
			{ icon: 'fa-users-viewfinder', primary: 'Gym', secondary: `ABC · 3 ${m.members()}` }
		],
		[
			{ type: 'delegation', data: { ...delegation, school: null } },
			{ icon: 'fa-users-viewfinder', primary: 'ABC', secondary: `ABC · 3 ${m.members()}` }
		],
		[
			{ type: 'page', data: page },
			{ icon: 'fa-chart-pie', primary: 'Stats' }
		],
		[
			{ type: 'config', data: config },
			{ icon: 'fa-gears', primary: 'Title', secondary: 'Section' }
		],
		[
			{ type: 'foreignUser', data: foreignUser },
			{ icon: 'fa-user-xmark', primary: 'Fo Reign', secondary: 'f@b.c' }
		]
	];
	test.each(cases)('%o', (item, expected) => {
		expect(describeItem(item)).toEqual(expected);
	});
	test('transactions show whether they arrived', () => {
		expect(describeItem({ type: 'transaction', data: transaction }).icon).toBe('fa-circle-xmark');
		expect(
			describeItem({ type: 'transaction', data: { ...transaction, recievedAt: '2026-01-01' } }).icon
		).toBe('fa-circle-check');
	});
});

describe('searchHint', () => {
	test('too short a term', () => {
		expect(searchHint('a', 0, false)).toBe(m.commandPaletteMinChars());
	});
	test('nothing found once settled', () => {
		expect(searchHint('ab', 0, false)).toBe(m.commandPaletteNoResults());
		expect(searchHint('ab', 0, true)).toBeUndefined();
		expect(searchHint('ab', 2, false)).toBeUndefined();
		expect(searchHint('', 0, false)).toBeUndefined();
	});
});
