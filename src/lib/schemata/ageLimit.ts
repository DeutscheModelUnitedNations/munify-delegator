import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/** An age limit of a conference's range, in years; empty switches it off. */
export function ageLimitSchema() {
	return z
		.number()
		.int({ error: () => m.conferenceAgeLimitRange() })
		.min(1, { error: () => m.conferenceAgeLimitRange() })
		.max(120, { error: () => m.conferenceAgeLimitRange() })
		.nullish();
}
