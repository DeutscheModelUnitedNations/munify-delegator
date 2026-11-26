/**
 * Payment reference ids are printed on transfer forms, so they avoid characters that are easy to
 * misread and are grouped in fours: `ACDE-FHJK-MNPR-TUVW`.
 */
export const PAYMENT_REFERENCE_ALPHABET = 'ACDEFHJKMNPRTUVWXY3479';
export const PAYMENT_REFERENCE_LENGTH = 16;
const GROUP = 4;

/** A reference's 16 characters in its printed form, a dash after every four. */
export function formatPaymentReference(chars: string) {
	const groups: string[] = [];
	for (let i = 0; i < chars.length; i += GROUP) groups.push(chars.slice(i, i + GROUP));
	return groups.join('-');
}

const ALLOWED = new Set(PAYMENT_REFERENCE_ALPHABET);

/**
 * Every string in `purpose` (a transfer's Verwendungszweck) that could be a payment reference, in
 * its printed form. Banks and payers break, re-space and re-case the purpose, so the dashes, spaces
 * and line breaks are dropped and the case ignored before looking: any 16 characters in a row of
 * the reference alphabet are a candidate. That finds more than there are references (a candidate
 * can start in the middle of one or span two words), which is fine, the caller keeps those that
 * name a payment.
 */
export function paymentReferenceCandidates(purpose: string): string[] {
	const compact = purpose.toUpperCase().replace(/[^A-Z0-9]/g, '');
	const candidates = new Set<string>();
	let runStart = 0;
	for (let i = 0; i <= compact.length; i++) {
		if (i < compact.length && ALLOWED.has(compact[i])) continue;
		for (let start = runStart; start + PAYMENT_REFERENCE_LENGTH <= i; start++) {
			candidates.add(
				formatPaymentReference(compact.slice(start, start + PAYMENT_REFERENCE_LENGTH))
			);
		}
		runStart = i + 1;
	}
	return [...candidates];
}
