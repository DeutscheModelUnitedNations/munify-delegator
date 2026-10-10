/** The two versions with the lower version number first, as `before` and `after`. */
export function orderVersions<V extends { version: number }>(a: V, b: V) {
	return a.version < b.version ? { before: a, after: b } : { before: b, after: a };
}
