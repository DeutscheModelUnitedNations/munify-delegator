/**
 * Spots contact details in a chat message before it goes out, so the composer can warn. It is a
 * nudge, not a filter: it errs towards missing an odd format over warning on every number.
 */

export type PersonalDetailKind = 'PHONE' | 'EMAIL' | 'MESSENGER';

// "(at)" and "[at]" are the usual ways around a plain "@"
const EMAIL = /[\p{L}\d._%+-]+\s*(?:@|\(at\)|\[at\])\s*[\p{L}\d-]+(?:\.[\p{L}\d-]+)*\.\p{L}{2,}/iu;

// Starts with "+" or "0" like German and international numbers do. Dots stay out so dates and
// clause numbers ("01.03.2026", "0.5") are no phone numbers.
const PHONE_CANDIDATE = /(?<![\p{L}\d.,])(?:\+|0)[\d  \-/()]{5,}\d/gu;
const PHONE_DIGITS = { min: 7, max: 15 };

const MESSENGER =
	/\b(?:wa\.me|chat\.whatsapp\.com|t\.me|telegram\.me|signal\.me|signal\.group|instagram\.com|snapchat\.com|discord\.gg|discord\.com\/invite|tiktok\.com|facebook\.com|threema\.id)\//i;

function hasPhoneNumber(text: string) {
	for (const [candidate] of text.matchAll(PHONE_CANDIDATE)) {
		const digits = candidate.replace(/\D/g, '').length;
		if (digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max) return true;
	}
	return false;
}

/** The kinds of contact details `text` seems to contain, empty when none. */
export function findPersonalDetails(text: string): PersonalDetailKind[] {
	const found: PersonalDetailKind[] = [];
	if (hasPhoneNumber(text)) found.push('PHONE');
	if (EMAIL.test(text)) found.push('EMAIL');
	if (MESSENGER.test(text)) found.push('MESSENGER');
	return found;
}

/**
 * What pressing send does with `body`: nothing while it is empty or one is on its way, a warning
 * when it seems to hold contact details the writer has not confirmed, and otherwise send it.
 */
export function sendStep({
	body,
	sending,
	confirmed
}: {
	body: string;
	sending: boolean;
	/** The text the writer chose to send despite the warning */
	confirmed: string | null;
}): 'wait' | 'warn' | 'send' {
	if (!body || sending) return 'wait';
	if (body !== confirmed && findPersonalDetails(body).length > 0) return 'warn';
	return 'send';
}
