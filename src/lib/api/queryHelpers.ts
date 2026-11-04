/** Small helpers for building the arguments of rumble's list queries. */

/** Escapes the characters `like` gives a meaning to, so a search text is matched literally. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

/** `%text%` for an `ilike` filter. */
export const containing = (text: string) => ({ ilike: `%${escapeLike(text)}%` });

/**
 * A count the backend answered. The generated client types every top-level scalar as a
 * subscribeable but resolves it to the plain number, so this only tells the compiler so.
 */
export const asCount = (count: unknown): number => Number(count);
