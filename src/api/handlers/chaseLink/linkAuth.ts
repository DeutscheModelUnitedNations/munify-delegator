import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import {
	LINK_REMOTE_RESOURCE,
	LINK_REMOTE_URL,
	LINK_RESOURCE,
	OIDC_M2M_CLIENT_ID,
	OIDC_M2M_CLIENT_SECRET,
	OIDC_RESOURCE,
	OIDC_ROLE_CLAIM,
	OIDC_ROLE_MAP
} from '$app/env/private';
import { appRolesOf, roleNamesInClaims } from '#api/services/oidc/roleClaims';
import { LINK_ROLE, REMOTE_LINK_ROLE } from '#api/services/oidc/oidcRoles';
import { discoveryUrl } from '#api/services/oidc/discoveryUrl';
import { PUBLIC_OIDC_AUTHORITY } from '$app/env/public';
import { logger } from '#lib/logger';

/**
 * How the linked instances know each other (`docs/plans/chase-link.md`): through the OIDC provider
 * both already trust. Each asks it for an access token for the other's API resource with its
 * machine-to-machine client (`OIDC_M2M_CLIENT_ID`, the client credentials grant: Logto allows it
 * only for M2M apps, never for the app people sign in with) and sends that along. A request is the
 * other instance's when its token is for this instance's resource (`LINK_RESOURCE`) and grants the
 * link role (`chase` here, `delegator` in CHASE) the way a person's token grants `admin`: through
 * the role claim (`OIDC_ROLE_CLAIM`, `OIDC_ROLE_MAP`), or as a scope, which is how Logto hands an M2M
 * app the permissions of its roles. Nothing about the link is stored or paired:
 * it is configuration only, and copied as is into CHASE (`src/api/services/link/linkAuth.ts`).
 */

/** The header the token travels in. Not `Authorization`: the session library takes bearer tokens. */
export const LINK_TOKEN_HEADER = 'x-munify-link-token';

/** Renewed this long before it expires, so no call goes out with a token about to lapse. */
const RENEW_BEFORE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

const linkSettingsSchema = z.object({
	LINK_REMOTE_URL: z.string().min(1),
	LINK_REMOTE_RESOURCE: z.string().min(1),
	'LINK_RESOURCE or OIDC_RESOURCE': z.string().min(1),
	OIDC_M2M_CLIENT_ID: z.string().min(1),
	OIDC_M2M_CLIENT_SECRET: z.string().min(1)
});

/** The variables the link needs, by the name a warning gives them. */
type LinkSettings = Partial<Record<keyof z.infer<typeof linkSettingsSchema>, string>>;

/**
 * The link's configuration from its variables: undefined while the link is not set up at all, and
 * the variables still `missing` while it is only partly.
 */
export function linkConfigOf(settings: LinkSettings) {
	if (!settings.LINK_REMOTE_URL && !settings.LINK_REMOTE_RESOURCE)
		return { missing: [], config: undefined };
	const parsed = linkSettingsSchema.safeParse(settings);
	if (!parsed.success) {
		return { missing: parsed.error.issues.map(({ path }) => String(path[0])), config: undefined };
	}
	const values = parsed.data;
	return {
		missing: [],
		config: {
			remoteUrl: new URL(values.LINK_REMOTE_URL).origin,
			remoteResource: values.LINK_REMOTE_RESOURCE,
			resource: values['LINK_RESOURCE or OIDC_RESOURCE'],
			clientId: values.OIDC_M2M_CLIENT_ID,
			clientSecret: values.OIDC_M2M_CLIENT_SECRET
		}
	};
}

/** The link's configuration, or undefined while it is not (completely) set. */
export function linkConfig() {
	const { config, missing } = linkConfigOf({
		LINK_REMOTE_URL,
		LINK_REMOTE_RESOURCE,
		'LINK_RESOURCE or OIDC_RESOURCE': LINK_RESOURCE ?? OIDC_RESOURCE,
		OIDC_M2M_CLIENT_ID,
		OIDC_M2M_CLIENT_SECRET
	});
	if (missing.length > 0)
		logger.warn('The link is only partly configured, so it is off', { missing });
	return config;
}

export type LinkConfig = NonNullable<ReturnType<typeof linkConfig>>;

const discoverySchema = z.object({
	issuer: z.string(),
	jwks_uri: z.string().url(),
	token_endpoint: z.string().url()
});

type Provider = z.infer<typeof discoverySchema> & { keys: ReturnType<typeof createRemoteJWKSet> };

let provider: Promise<Provider> | undefined;

/** Fetched once, and again after a failure. */
function oidcProvider() {
	provider ??= (async () => {
		const response = await fetch(discoveryUrl(PUBLIC_OIDC_AUTHORITY), {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
		if (!response.ok) throw new Error(`OIDC discovery answered ${response.status}`);
		const discovery = discoverySchema.parse(await response.json());
		return { ...discovery, keys: createRemoteJWKSet(new URL(discovery.jwks_uri)) };
	})();
	provider.catch(() => {
		provider = undefined;
	});
	return provider;
}

const tokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number().optional()
});

let outbound: Promise<{ token: string; renewAt: number }> | undefined;

/** An access token for the other instance's API, kept until shortly before it expires. */
export async function linkAccessToken(config: LinkConfig) {
	const current = await outbound?.catch(() => undefined);
	if (current && Date.now() < current.renewAt) return current.token;

	outbound = (async () => {
		const { token_endpoint } = await oidcProvider();
		const response = await fetch(token_endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`
			},
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				resource: config.remoteResource,
				// the role the other instance knows this one by, as Logto grants an M2M app's permissions
				scope: REMOTE_LINK_ROLE
			}),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
		if (!response.ok) {
			throw new Error(
				`The link's token request failed: ${response.status} ${(await response.text()).slice(0, 500)}`
			);
		}
		const { access_token, expires_in = 300 } = tokenResponseSchema.parse(await response.json());
		return {
			token: access_token,
			renewAt: Date.now() + Math.max(expires_in * 1000 - RENEW_BEFORE_MS, 0)
		};
	})();
	return (await outbound).token;
}

/** The app roles a token grants: those its role claim names, and those it holds as scopes. */
export function rolesOfToken(payload: Record<string, unknown>) {
	const claimed = OIDC_ROLE_CLAIM
		? roleNamesInClaims({ sources: [payload], path: OIDC_ROLE_CLAIM })
		: [];
	const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
	return appRolesOf({ names: [...claimed, ...scopes], roleMap: OIDC_ROLE_MAP });
}

/**
 * Whether `token` is the other instance calling: signed by the provider, unexpired, for this
 * instance's API, and granting the link role. Never throws: a token that does not pass is nobody.
 */
export async function isRemoteInstanceToken({
	token,
	config
}: {
	token: string;
	config: LinkConfig;
}) {
	try {
		const { issuer, keys } = await oidcProvider();
		const { payload } = await jwtVerify(token, keys, { issuer, audience: config.resource });
		return rolesOfToken(payload).includes(LINK_ROLE);
	} catch (error) {
		logger.info('A link token was refused', { reason: String(error) });
		return false;
	}
}
