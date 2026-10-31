/**
 * Delegation entry codes and supervisor connection codes: the only thing standing between a
 * signed-in account and a delegation's or supervisor's details, so long enough not to be guessed
 * (20^8, besides `codeGuessLimiter` on the server). Codes handed out before the change are six
 * long and keep working.
 */
export const ENTRY_CODE_LENGTH = 8;
const LEGACY_ENTRY_CODE_LENGTH = 6;

/** Letters that cannot be mistaken for one another (https://github.com/CyberAP/nanoid-dictionary). */
export const ENTRY_CODE_ALPHABET = '6789BCDFGHJKLMNPQRTW';

/** A code as people type or paste it, the way codes are stored. */
export function normalizeEntryCode(code: string) {
	return code.trim().toUpperCase();
}

/**
 * Whether `code` is worth looking up: a full-length one at once, a six-letter one from before
 * only once `settled` - while somebody is still typing an eight-letter code, its first six letters
 * would otherwise be looked up, miss, and count as a wrong guess.
 */
export function isLookupReady({ code, settled }: { code: string; settled: boolean }) {
	return code.length === ENTRY_CODE_LENGTH || (settled && code.length === LEGACY_ENTRY_CODE_LENGTH);
}
