/*
 * Confirmed pairs are transitive: when A and B are one person, and B and C are, so are A and C.
 * Every account of such a group is paired with every other one, so whatever reads one account's
 * confirmed pairs (the care notes, the read rules, the badge) sees the whole person without walking
 * a chain. The pairs nobody decided themselves are `inferred`; they follow the decided ones.
 */

type Status = 'OPEN' | 'DISMISSED' | 'CONFIRMED';

export interface LinkPair {
	id: string;
	userId: string;
	candidateId: string;
	status: Status;
	inferred: boolean;
	/** empty for a pair only the links made, which the matcher never found */
	reasons: readonly string[];
}

export interface LinkChanges {
	/** open pairs within one person: confirmed, as inferred */
	confirm: string[];
	/** inferred pairs no longer within one person that the matcher found: open again */
	reopen: string[];
	/** inferred pairs no longer within one person that only the links made */
	remove: string[];
	/** accounts of one person without a pair yet, the smaller id first */
	insert: { userId: string; candidateId: string }[];
	/** dismissed pairs within one person: the decisions contradict each other */
	conflicts: LinkPair[];
}

/** The groups of accounts the decided confirmations make one person, as a lookup of each root. */
function personOf(pairs: readonly LinkPair[]) {
	const parent = new Map<string, string>();
	const find = (id: string): string => {
		const up = parent.get(id) ?? id;
		if (up === id) return id;
		const root = find(up);
		parent.set(id, root);
		return root;
	};
	for (const pair of pairs) {
		parent.set(pair.userId, find(pair.userId));
		parent.set(pair.candidateId, find(pair.candidateId));
		if (pair.status === 'CONFIRMED' && !pair.inferred) {
			parent.set(find(pair.userId), find(pair.candidateId));
		}
	}
	return { find, accounts: () => [...parent.keys()] };
}

/** Every pair of accounts within one group, the smaller id first. */
function pairsWithin(groups: Iterable<string[]>) {
	return [...groups].flatMap((accounts) =>
		accounts.flatMap((userId, i) =>
			accounts.slice(i + 1).map((candidateId) => ({ userId, candidateId }))
		)
	);
}

/** Files a pair under what has to happen to it, if anything. */
function sortPair({
	pair,
	onePerson,
	changes
}: {
	pair: LinkPair;
	onePerson: boolean;
	changes: LinkChanges;
}) {
	if (onePerson && pair.status === 'OPEN') changes.confirm.push(pair.id);
	else if (onePerson && pair.status === 'DISMISSED') changes.conflicts.push(pair);
	else if (!onePerson && pair.inferred) {
		(pair.reasons.length > 0 ? changes.reopen : changes.remove).push(pair.id);
	}
}

/**
 * What it takes for `pairs` to hold every link the decided confirmations imply, and none they no
 * longer do. `pairs` are all pairs among the accounts concerned: those a changed decision reaches
 * through confirmed pairs, decided or inferred.
 */
export function reconcileLinks(pairs: readonly LinkPair[]): LinkChanges {
	const { find, accounts } = personOf(pairs);
	const changes: LinkChanges = { confirm: [], reopen: [], remove: [], insert: [], conflicts: [] };
	for (const pair of pairs) {
		sortPair({ pair, onePerson: find(pair.userId) === find(pair.candidateId), changes });
	}

	const groups = new Map<string, string[]>();
	for (const id of accounts().sort()) {
		const root = find(id);
		groups.set(root, [...(groups.get(root) ?? []), id]);
	}
	const paired = new Set(pairs.map((pair) => `${pair.userId}|${pair.candidateId}`));
	changes.insert = pairsWithin(groups.values()).filter(
		(link) => !paired.has(`${link.userId}|${link.candidateId}`)
	);
	return changes;
}
