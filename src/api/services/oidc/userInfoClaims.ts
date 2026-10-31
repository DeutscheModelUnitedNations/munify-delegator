import type { OIDCSession } from '@m1212e/sveltekit-oidc';
import { claimAt } from './roleClaims';
import { logger } from '#lib/logger';

type Claims = Record<string, unknown>;

/** Asks the provider's userinfo endpoint about the holder of an access token. */
type FetchUserInfo = (accessToken: string, sub: string) => Promise<Claims>;

/** How long an answer is reused at most, so a role taken away at the provider takes effect. */
const MAX_AGE_MS = 5 * 60 * 1000;
/** How long a failed request is remembered, so a provider in trouble is not asked on every request. */
const FAILURE_AGE_MS = 60 * 1000;
const MAX_ENTRIES = 1000;

/**
 * What the userinfo endpoint says about a session whose tokens lack a claim: some providers
 * (Authentik and Authelia, depending on their setup) put groups only there. One request per access
 * token, reused until the token expires (at most `MAX_AGE_MS`), shared by concurrent requests.
 */
export function createUserInfoClaims(now: () => number = Date.now) {
	const cache = new Map<string, { claims: Promise<Claims | undefined>; until: number }>();
	const ofSession = new WeakMap<OIDCSession, Claims>();

	function forget(time: number) {
		for (const [token, entry] of cache) if (entry.until <= time) cache.delete(token);
		for (const token of cache.keys()) {
			if (cache.size < MAX_ENTRIES) break;
			cache.delete(token);
		}
	}

	function request({
		session,
		accessToken,
		fetchUserInfo
	}: {
		session: OIDCSession;
		accessToken: string;
		fetchUserInfo: FetchUserInfo;
	}) {
		const time = now();
		const cached = cache.get(accessToken);
		if (cached && cached.until > time) return cached.claims;
		forget(time);

		const exp = session.accessTokenClaims?.exp;
		const until = Math.min(time + MAX_AGE_MS, typeof exp === 'number' ? exp * 1000 : Infinity);
		const entry = {
			until,
			claims: fetchUserInfo(accessToken, session.user.sub).catch((error: unknown) => {
				logger.warn('Fetching userinfo failed', { sub: session.user.sub, err: error });
				entry.until = Math.min(until, now() + FAILURE_AGE_MS);
				return undefined;
			})
		};
		cache.set(accessToken, entry);
		return entry.claims;
	}

	return {
		/** Asks the userinfo endpoint for `session` unless its tokens already hold `claim`. */
		async load({
			session,
			claim,
			fetchUserInfo
		}: {
			session: OIDCSession;
			claim: string;
			fetchUserInfo: FetchUserInfo;
		}) {
			const accessToken = session.tokens.accessToken;
			const inTokens = [session.accessTokenClaims, session.idTokenClaims].some(
				(claims) => claimAt({ claims, path: claim }) != null
			);
			if (inTokens || !accessToken) return;
			const claims = await request({ session, accessToken, fetchUserInfo });
			if (claims) ofSession.set(session, claims);
		},
		/** What `load` found for this session, if it asked. */
		of: (session: OIDCSession): Claims | undefined => ofSession.get(session)
	};
}

export const userInfoClaims = createUserInfoClaims();
