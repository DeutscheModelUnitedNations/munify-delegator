/**
 * Deeply compares two values for structural equality with specific semantics.
 *
 * Characteristics:
 * - Uses Object.is for primitives and edge cases (handles NaN equality and distinguishes -0 vs +0).
 * - Supports cyclic structures via a WeakMap to avoid infinite recursion.
 * - Arrays are compared positionally; lengths must match and each element is deep-compared.
 * - Plain objects are compared by their own enumerable string keys, but keys with value `undefined`
 *   are ignored on both sides (i.e., `{a: 1}` equals `{a: 1, b: undefined}`).
 *
 * Important limitations/notes:
 * - Only own enumerable string keys are considered (symbol and non-enumerable properties are ignored).
 * - Special object types (Date, RegExp, Map, Set, TypedArray, ArrayBuffer, etc.) are not handled
 *   specially and are treated like plain objects; their logical equality is not guaranteed.
 * - Prototype differences are ignored (objects with identical enumerable own properties but different
 *   prototypes are considered equal).
 * - Sparse arrays: holes are treated the same as explicit `undefined` when accessed by index.
 *
 * @param a - Left-hand value to compare.
 * @param b - Right-hand value to compare.
 * @param seen - Internal WeakMap for cycle detection; callers typically omit this.
 * @returns true if `a` and `b` are considered deeply equal under these rules; otherwise false.
 *
 * @example
 * deepEquals(1, 1); // true
 * deepEquals(NaN, NaN); // true
 * deepEquals(-0, +0); // false
 * deepEquals({ a: 1 }, { a: 1 }); // true
 * deepEquals({ a: 1 }, { a: 1, b: undefined }); // true (undefined-valued keys ignored)
 * deepEquals([1, 2], [1, 2]); // true
 * deepEquals([1, undefined], [1]); // false (different lengths)
 *
 * // Cyclic structures
 * const x: any = {}; x.self = x;
 * const y: any = {}; y.self = y;
 * deepEquals(x, y); // true
 */
export default function deepEquals(
	a: unknown,
	b: unknown,
	seen = new WeakMap<object, object>()
): boolean {
	if (Object.is(a, b)) return true; // handles -0/+0 and NaN

	// If types differ, or one is null and the other not, bail out
	if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
		return false;
	}

	// Cycle detection
	const mapped = seen.get(a);
	if (mapped && mapped === b) return true;
	seen.set(a, b);

	// Handle Array vs non-Array
	const aIsArray = Array.isArray(a);
	const bIsArray = Array.isArray(b);
	if (aIsArray !== bIsArray) return false;

	if (Array.isArray(a) && Array.isArray(b)) return arraysEqual(a, b, seen);
	return objectsEqual(a, b, seen);
}

/** Positions matter; undefined entries are compared normally. */
function arraysEqual(a: unknown[], b: unknown[], seen: WeakMap<object, object>) {
	if (a.length !== b.length) return false;
	return a.every((entry, i) => deepEquals(entry, b[i], seen));
}

/** Compares plain objects, but ignores keys whose value is undefined on either side. */
function objectsEqual(a: object, b: object, seen: WeakMap<object, object>) {
	const definedEntries = (value: object) =>
		new Map(Object.entries(value).filter(([, entry]) => entry !== undefined));
	const entriesA = definedEntries(a);
	const entriesB = definedEntries(b);

	// Same number of meaningful keys, so a key set contained in b's is the same key set
	if (entriesA.size !== entriesB.size) return false;

	for (const [k, value] of entriesA) {
		if (!entriesB.has(k)) return false;
		if (!deepEquals(value, entriesB.get(k), seen)) return false;
	}

	return true;
}
