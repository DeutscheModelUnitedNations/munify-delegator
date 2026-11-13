import { isBundled } from '#lib/helpers/emailKinds';
import type { DueEmail } from './dueEmails';

/** Several due mails sent as one: same recipient and kind, the first one's text naming them all. */
export type EmailBundle = readonly [DueEmail, ...DueEmail[]];

/**
 * What goes into one mail together. Surveys only bundle with the same deadline, since their text
 * names one date.
 */
const bundleKey = (email: DueEmail) =>
	isBundled(email.kind)
		? `${email.recipient.id}:${email.kind}:${email.survey?.deadline.toISOString() ?? ''}`
		: undefined;

/**
 * Groups the mails a sweep sends into the mails that go out: each of `BUNDLED_KINDS` once per
 * recipient (and survey deadline), every other one alone. Keeps the order of each bundle's first mail.
 */
export function bundleEmails(emails: readonly DueEmail[]): EmailBundle[] {
	const bundles: EmailBundle[] = [];
	const open = new Map<string, DueEmail[]>();
	for (const email of emails) {
		const key = bundleKey(email);
		const bundle = key === undefined ? undefined : open.get(key);
		if (bundle) {
			bundle.push(email);
			continue;
		}
		const fresh: [DueEmail, ...DueEmail[]] = [email];
		bundles.push(fresh);
		if (key !== undefined) open.set(key, fresh);
	}
	return bundles;
}
