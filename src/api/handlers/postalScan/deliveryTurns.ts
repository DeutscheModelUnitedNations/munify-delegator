/**
 * Whose file is taken in next: people take turns, so one with a big stack keeps no other waiting for all
 * of it. `people` have files waiting, the one waiting longest first; `lastServed` counts up with each file
 * this process took in.
 */
export function inTurn({
	people,
	lastServed
}: {
	people: readonly string[];
	lastServed: ReadonlyMap<string, number>;
}) {
	return people.toSorted((a, b) => (lastServed.get(a) ?? 0) - (lastServed.get(b) ?? 0));
}
