import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';
import { m } from '$lib/paraglide/messages';
import type { ConfigEntry, PageEntry } from './pageRegistry';

export interface SearchUser {
	id: string;
	email: string;
	givenName: string;
	familyName: string;
	participationType: string;
}

export interface SearchDelegation {
	id: string;
	school: string | null;
	entryCode: string;
	memberCount: number;
	headDelegateUserId: string | null;
}

export interface SearchForeignUser {
	id: string;
	email: string;
	givenName: string;
	familyName: string;
}

export interface SearchTransaction {
	id: string;
	amount: number;
	currency: string;
	recievedAt: string | null;
}

export type ResultItem =
	| { type: 'page'; data: PageEntry }
	| { type: 'user'; data: SearchUser }
	| { type: 'delegation'; data: SearchDelegation }
	| { type: 'config'; data: ConfigEntry }
	| { type: 'foreignUser'; data: SearchForeignUser }
	| { type: 'transaction'; data: SearchTransaction };

export interface ResultLists {
	users: readonly SearchUser[];
	delegations: readonly SearchDelegation[];
	transactions: readonly SearchTransaction[];
	pages: readonly PageEntry[];
	configs: readonly ConfigEntry[];
	foreignUsers: readonly SearchForeignUser[];
}

/**
 * Every result in one list, in the order the palette shows them and the keyboard walks them:
 * users, delegations, transactions, pages, configuration, foreign users.
 */
export function flattenResults(lists: ResultLists): ResultItem[] {
	return [
		...lists.users.map((data) => ({ type: 'user' as const, data })),
		...lists.delegations.map((data) => ({ type: 'delegation' as const, data })),
		...lists.transactions.map((data) => ({ type: 'transaction' as const, data })),
		...lists.pages.map((data) => ({ type: 'page' as const, data })),
		...lists.configs.map((data) => ({ type: 'config' as const, data })),
		...lists.foreignUsers.map((data) => ({ type: 'foreignUser' as const, data }))
	];
}

/** Where choosing a result leads: a user's card, or a page. */
export type ResultTarget = { userId: string } | { href: ResolvedPathname };

export function resultTarget(item: ResultItem, conferenceId: string): ResultTarget {
	switch (item.type) {
		case 'page':
			return { href: item.data.href };
		case 'user':
		case 'foreignUser':
			return { userId: item.data.id };
		case 'delegation':
			// A delegation opens its head delegate's card, or the delegation list filtered to it
			if (item.data.headDelegateUserId) return { userId: item.data.headDelegateUserId };
			return {
				href: resolve(
					`/(authenticated)/management/[conferenceId]/delegations?filter=${item.data.entryCode}`,
					{ conferenceId }
				)
			};
		case 'config':
			return {
				href: resolve(
					`/(authenticated)/management/[conferenceId]/configuration?tab=${item.data.tab}`,
					{ conferenceId }
				)
			};
		case 'transaction':
			return {
				href: resolve(
					`/(authenticated)/management/[conferenceId]/payments?searchValue=${item.data.id}`,
					{ conferenceId }
				)
			};
	}
}

/**
 * The index an arrow key moves the selection to, clamped to the list; `undefined` when there is
 * nothing to move through or the key is not an arrow.
 */
export function steppedIndex(key: string, activeIndex: number, count: number) {
	if (count === 0) return undefined;
	if (key === 'ArrowDown') return Math.min(activeIndex + 1, count - 1);
	if (key === 'ArrowUp') return Math.max(activeIndex - 1, 0);
	return undefined;
}

const participationTypeLabels = new Map<string, () => string>([
	['delegation', m.delegationMember],
	['single', m.singleParticipant],
	['supervisor', m.supervisor],
	['team', m.teamMember]
]);

export function participationTypeLabel(type: string): string {
	return participationTypeLabels.get(type)?.() ?? type;
}

export function describeTransaction(transaction: SearchTransaction) {
	const { amount, currency } = transaction;
	if (!transaction.recievedAt) {
		return m.commandPalettePaymentNotReceived({ amount, currency });
	}
	return m.commandPalettePaymentReceived({
		amount,
		currency,
		date: new Date(transaction.recievedAt).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	});
}

/** How one result reads in the list: its icon and its primary and secondary text. */
export function describeItem(item: ResultItem): {
	icon: string;
	primary: string;
	secondary?: string;
} {
	switch (item.type) {
		case 'user':
			return {
				icon: 'fa-user',
				primary: `${item.data.givenName} ${item.data.familyName}`,
				secondary: `${item.data.email} · ${participationTypeLabel(item.data.participationType)}`
			};
		case 'delegation':
			return {
				icon: 'fa-users-viewfinder',
				primary: item.data.school ?? item.data.entryCode,
				secondary: `${item.data.entryCode} · ${item.data.memberCount} ${m.members()}`
			};
		case 'transaction':
			return {
				icon: item.data.recievedAt ? 'fa-circle-check' : 'fa-circle-xmark',
				primary: item.data.id,
				secondary: describeTransaction(item.data)
			};
		case 'page':
			return { icon: item.data.icon, primary: item.data.title() };
		case 'config':
			return { icon: item.data.icon, primary: item.data.title(), secondary: item.data.section() };
		case 'foreignUser':
			return {
				icon: 'fa-user-xmark',
				primary: `${item.data.givenName} ${item.data.familyName}`,
				secondary: item.data.email
			};
	}
}

/** The note under the results: too short a term, or nothing found for a long enough one. */
export function searchHint(searchTerm: string, resultCount: number, searchLoading: boolean) {
	if (searchTerm.length === 1) return m.commandPaletteMinChars();
	if (resultCount === 0 && searchTerm.length >= 2 && !searchLoading) {
		return m.commandPaletteNoResults();
	}
	return undefined;
}
