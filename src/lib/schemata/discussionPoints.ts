import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/** One point for discussion: a single line, whitespace (line breaks included) folded to spaces. */
function discussionPointSchema() {
	return z
		.string()
		.transform((text) => text.replace(/\s+/g, ' ').trim())
		.pipe(z.string().min(1, { error: () => m.discussionPointEmpty() }));
}

/**
 * The points for discussion of an agenda item, in order. Any number, any length; an empty point
 * is refused.
 */
export function discussionPointsSchema() {
	return z.array(discussionPointSchema());
}

/** The points as an editor saves them: whitespace folded, blank points left out, order kept. */
export function withoutBlankPoints(points: readonly string[]) {
	return points
		.map((point) => point.replace(/\s+/g, ' ').trim())
		.filter((point) => point.length > 0);
}
