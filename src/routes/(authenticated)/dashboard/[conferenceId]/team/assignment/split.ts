/** Which part (counted from 0) each member of a delegation being split goes into, by member id. */
export type PartOf = Record<string, number>;

/** Where a split starts: the first member on their own, everybody else together. */
export const initialParts = (memberIds: readonly string[]): PartOf =>
	Object.fromEntries(memberIds.map((id, index) => [id, index === 0 ? 0 : 1]));

/** The part counts (2 to 10) that divide `size` members into equally sized parts. */
export const evenDivisions = (size: number) =>
	Array.from({ length: 9 }, (_, index) => index + 2).filter(
		(count) => count <= size && size % count === 0
	);

/** `count` equally sized parts, filled in member order. */
export function quickSplit(memberIds: readonly string[], count: number): PartOf {
	const size = memberIds.length / count;
	return Object.fromEntries(memberIds.map((id, index) => [id, Math.floor(index / size)]));
}

/** Drops a part; its members move into the part before it (or after it, for the first). */
export const withoutPart = (partOf: PartOf, removed: number): PartOf =>
	Object.fromEntries(
		Object.entries(partOf).map(([id, part]) => [id, part < removed ? part : Math.max(part - 1, 0)])
	);

/** The members of each of `count` parts, in member order. */
export const partsOf = <M extends { id: string }>(
	members: readonly M[],
	partOf: PartOf,
	count: number
) =>
	Array.from({ length: count }, (_, part) =>
		members.filter((member) => partOf[member.id] === part)
	);
