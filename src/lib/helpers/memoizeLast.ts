/** The same value, or arrays holding the same items. */
function sameItems(a: unknown, b: unknown) {
	if (a === b) return true;
	return (
		Array.isArray(a) &&
		Array.isArray(b) &&
		a.length === b.length &&
		a.every((item, index) => item === b[index])
	);
}

/** Whether two arguments are the same, looking one level into arrays and plain objects. */
function shallowSame(a: unknown, b: unknown): boolean {
	if (sameItems(a, b)) return true;
	if (!isPlainObject(a) || !isPlainObject(b)) return false;
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => key in b && sameItems(a[key], b[key]))
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
	);
}

/**
 * `fn`, remembering its last call: called again with arguments that are the same (an array with
 * the same items, an object whose properties are such arrays or the same values), it returns the
 * last result instead of working it out again. Meant for pure work over plain data that a
 * `$derived` may re-run without anything having changed; the arguments must not be mutated.
 */
export function memoizeLast<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
	let last: { args: A; result: R } | undefined;
	return (...args: A) => {
		if (
			last &&
			last.args.length === args.length &&
			args.every((arg, i) => shallowSame(arg, last?.args[i]))
		) {
			return last.result;
		}
		const result = fn(...args);
		last = { args, result };
		return result;
	};
}

/**
 * A function that hands back the value it was last given whenever it is given an equal one (as
 * JSON), so a plain copy of a live result keeps its identity while the data stays the same. Live
 * queries announce updates that change nothing (a query elsewhere refreshing the cache they read,
 * a resubscription replaying its last value); kept identical, they stop at the copy. For small
 * plain data only: the comparison serialises both values.
 */
export function keepWhileEqual<T>() {
	let last: { value: T; json: string | undefined } | undefined;
	return (value: T): T => {
		if (!last) {
			last = { value, json: undefined };
			return value;
		}
		// A replay usually carries the very same rows: no need to serialise anything then.
		if (sameItems(last.value, value)) return last.value;
		last.json ??= JSON.stringify(last.value);
		const json = JSON.stringify(value);
		if (last.json === json) return last.value;
		last = { value, json };
		return value;
	};
}
