/**
 * `path` as a path on this site, or `fallback` when it is not one. The value is resolved against
 * `origin` the way a browser resolves a `Location` header, so what only looks like a path is
 * caught too: `//evil.example` and `/\evil.example` (a backslash reads as a slash) both navigate
 * away from the site. For a redirect after a sign-in or a notice, never redirect anywhere else.
 */
export function sameSitePath(
	path: string | null | undefined,
	origin: string,
	fallback = '/'
): string {
	if (!path || !path.startsWith('/')) return fallback;
	let target: URL;
	try {
		target = new URL(path, origin);
	} catch {
		return fallback;
	}
	if (target.origin !== origin) return fallback;
	return target.pathname + target.search + target.hash;
}
