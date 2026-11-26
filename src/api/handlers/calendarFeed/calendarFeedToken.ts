import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { CERTIFICATE_SECRET } from '$app/env/private';

/**
 * The secret part of a calendar subscription link: `<feed id>.<MAC of the id>`. The MAC's key is
 * derived from `CERTIFICATE_SECRET` with a label of its own, so the table alone opens no feed and
 * the link can be shown again at any time without storing it.
 */

const SEPARATOR = '.';
/** 128 bits of the MAC, base64url. */
const MAC_LENGTH = 22;

let key: Buffer | undefined;

/** Derived on first use, not when the module loads (`vite build` runs without the secret). */
function feedKey() {
	key ??= Buffer.from(hkdfSync('sha256', CERTIFICATE_SECRET, '', 'munify-calendar-feed-1', 32));
	return key;
}

function macOf(feedId: string) {
	return createHmac('sha256', feedKey()).update(feedId).digest('base64url').slice(0, MAC_LENGTH);
}

/** The token of a feed's link. */
export function calendarFeedToken(feedId: string) {
	return `${feedId}${SEPARATOR}${macOf(feedId)}`;
}

/** The feed id a token names, or undefined when its MAC does not check out. */
export function feedIdOfToken(token: string): string | undefined {
	const at = token.lastIndexOf(SEPARATOR);
	if (at <= 0) return undefined;
	const feedId = token.slice(0, at);
	const given = Buffer.from(token.slice(at + 1));
	const expected = Buffer.from(macOf(feedId));
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
	return feedId;
}
