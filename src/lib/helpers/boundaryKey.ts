/**
 * What a layout's loading boundary is keyed by.
 *
 * A layout wraps its pages in a `PageBoundary` keyed by the path, so that every navigation
 * creates a fresh boundary, which is what shows the skeleton while the next page's data loads
 * (a boundary that already settled never shows its `pending` snippet again). Some sections keep a
 * frame of their own across their pages - the assignment's tabs and draft status, the paper hub's
 * shell - and show the skeleton below it themselves: the outer layout must not re-create that
 * frame, so for paths inside such a frame the key stops at the frame.
 *
 * `frames` are path segments relative to wherever they occur (`team/assignment`, `paperhub`); the
 * key is the pathname up to and including the first one found, or the whole pathname.
 */
export function boundaryKey({
	pathname,
	frames
}: {
	pathname: string;
	frames: readonly string[];
}): string {
	for (const frame of frames) {
		const needle = `/${frame}`;
		const start = pathname.indexOf(needle);
		if (start === -1) continue;
		const end = start + needle.length;
		// `/team/assignment` must not match `/team/assignments`
		if (end !== pathname.length && pathname[end] !== '/') continue;
		return pathname.slice(0, end);
	}
	return pathname;
}
