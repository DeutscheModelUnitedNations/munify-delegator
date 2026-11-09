import { isRemoteInstanceToken, linkConfig } from './linkAuth';

/**
 * Whether a request is the linked CHASE calling: it carries a token the provider issued to CHASE's
 * client for this instance's API (`linkAuth.ts`). Checked only when a request carries one, and
 * once per request (`context` keeps the promise).
 */
export async function isLinkCall(token: string | null) {
	const config = linkConfig();
	if (!token || !config) return false;
	return isRemoteInstanceToken({ token, config });
}
