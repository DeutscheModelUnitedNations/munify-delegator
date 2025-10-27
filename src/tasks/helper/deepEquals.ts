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
export default function deepEquals(a: any, b: any, seen = new WeakMap<object, object>()) {
	if (Object.is(a, b)) return true; // handles -0/+0 and NaN

	// If types differ, or one is null and the other not, bail out
	if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
		return false;
	}

	// Cycle detection
	const mapped = seen.get(a as object);
	if (mapped && mapped === b) return true;
	seen.set(a as object, b as object);

	// Handle Array vs non-Array
	const aIsArray = Array.isArray(a);
	const bIsArray = Array.isArray(b);
	if (aIsArray !== bIsArray) return false;

	if (aIsArray && bIsArray) {
		// For arrays, keep semantics: positions matter; undefined entries are compared normally
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEquals(a[i], b[i], seen)) return false;
		}
		return true;
	}

	// Compare plain objects, but ignore keys whose value is undefined on either side

	// Build key sets excluding keys with undefined values
	const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
	const keysB = Object.keys(b).filter((k) => b[k] !== undefined);

	// Quick check: same number of meaningful keys
	if (keysA.length !== keysB.length) return false;

	// Ensure same key set (ignoring undefined-valued keys)
	for (const k of keysA) {
		if (!Object.prototype.hasOwnProperty.call(b, k) || b[k] === undefined) {
			// If b doesn't have k, but a[k] is defined (we filtered undefined), then not equal
			return false;
		}
	}

	// Deep compare values for the filtered keys
	for (const k of keysA) {
		if (!deepEquals(a[k], b[k], seen)) return false;
	}

	// Also ensure b doesn't have extra defined keys not in a
	for (const k of keysB) {
		if (!Object.prototype.hasOwnProperty.call(a, k) || a[k] === undefined) {
			return false;
		}
	}

	return true;
}
