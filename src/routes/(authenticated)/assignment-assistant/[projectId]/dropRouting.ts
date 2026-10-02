/** Pure decisions behind the assignment assistant's drag and drop zones. */

interface DropState {
	draggedItem: { id: string };
	sourceContainer: string;
	targetContainer: string | null;
}

/** An item dropped into a different container than it came from. */
export interface DropMove {
	itemId: string;
	source: string;
	target: string;
}

/** The move a drop stands for, or `undefined` when nothing moved. */
export function dropMove(state: DropState): DropMove | undefined {
	const { draggedItem, sourceContainer, targetContainer } = state;
	if (!targetContainer || sourceContainer === targetContainer || !draggedItem.id) return undefined;
	return { itemId: draggedItem.id, source: sourceContainer, target: targetContainer };
}

/** Nation drop zones are named `nations-<alpha3Code>`, NSA drop zones `nsa-<id>`. */
export function isRoleContainer(container: string) {
	return container.startsWith('nations') || container.startsWith('nsa');
}

export interface RoleAssignment {
	/** `full` when the nation has fewer free seats than the delegation has members. */
	action: 'nation' | 'nsa' | 'full';
	/** The nation's alpha3 code or the NSA's id. */
	identifier: string;
}

/** What dropping a delegation of `members` people on a nation or NSA drop zone should do. */
export function planRoleAssignment<N extends { alpha3Code: string }>(
	container: string,
	members: number,
	sources: {
		nations: readonly { nation: N }[];
		nsas: readonly { id: string }[];
		remainingSeats: (nation: N) => number;
	}
): RoleAssignment | undefined {
	const identifier = container.split('-')[1];
	if (!identifier) return undefined;
	const nation = sources.nations.find((x) => x.nation.alpha3Code === identifier)?.nation;
	if (nation) {
		const full = sources.remainingSeats(nation) - members < 0;
		return { action: full ? 'full' : 'nation', identifier };
	}
	if (sources.nsas.some((x) => x.id === identifier)) return { action: 'nsa', identifier };
	return undefined;
}

/** Routes a single participant dropped on the pool, the conversion zone or a `role-<id>` zone. */
export function routeSingleDrop(
	move: DropMove,
	actions: {
		unassign: (singleId: string) => void;
		convert: (singleId: string) => void;
		assign: (singleId: string, roleId: string) => void;
	}
) {
	if (move.target === 'backToPool') return actions.unassign(move.itemId);
	if (move.target === 'convertToDelegation') return actions.convert(move.itemId);
	if (move.target.startsWith('role')) actions.assign(move.itemId, move.target.replace('role-', ''));
}

/** Bucket drop zones are named `bucket-<index>`. */
function bucketIndex(container: string) {
	return parseInt(container.split('-')[1]);
}

/** The buckets after moving `member` from the move's source bucket to its target bucket. */
export function movedBetweenBuckets<M extends { user: { id: string } }>(
	buckets: M[][],
	move: DropMove,
	member: M
): M[][] {
	const source = bucketIndex(move.source);
	const target = bucketIndex(move.target);
	const next = [...buckets];
	next[source] = next[source].filter((x) => x.user.id !== move.itemId);
	next[target] = [...next[target], member];
	return next;
}
