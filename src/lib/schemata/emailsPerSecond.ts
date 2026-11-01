import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/** The highest pace the team may set; above it a limit would make no difference. */
export const MAX_EMAILS_PER_SECOND = 1000;

const rangeError = () => m.emailsPerSecondRange({ max: MAX_EMAILS_PER_SECOND });

/** How many mails a conference's sweeps send per second at most: a whole number, `null` for no limit. */
export const emailsPerSecondSchema = z
	.number()
	.int({ error: rangeError })
	.min(1, { error: rangeError })
	.max(MAX_EMAILS_PER_SECOND, { error: rangeError })
	.nullable();

/** What the team typed: empty lifts the limit, anything outside the range is `undefined`. */
export function parseEmailsPerSecond(input: string) {
	const text = input.trim();
	if (text === '') return null;
	const parsed = emailsPerSecondSchema.safeParse(Number(text));
	return parsed.success ? parsed.data : undefined;
}
