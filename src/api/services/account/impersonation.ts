import type { ImpersonationTokens } from '@m1212e/sveltekit-oidc';
import {
	OIDC_M2M_CLIENT_ID,
	OIDC_M2M_CLIENT_SECRET,
	OIDC_M2M_RESOURCE,
	OIDC_RESOURCE
} from '$app/env/private';
import { OIDC } from '#api/services/OIDC.js';

const REQUEST_TIMEOUT = 10_000;

/** Whether the deployment has the Management API credentials impersonation needs. */
export function impersonationConfigured() {
	return !!OIDC_M2M_CLIENT_ID && !!OIDC_M2M_CLIENT_SECRET;
}

/** Logto's Management API lives next to its OIDC endpoints: the issuer minus `/oidc`, plus `/api`. */
function managementApiUrl(issuer: string) {
	return `${issuer.replace(/\/oidc\/?$/, '')}/api`;
}

async function responseError(what: string, response: Response) {
	// The body is the provider's own error description; tokens are never echoed back in it.
	return new Error(`${what} failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
}

/** An access token for the Management API, from the M2M app's client credentials. */
async function managementApiToken(): Promise<string> {
	const metadata = OIDC.core.configuration.serverMetadata();
	if (!metadata.token_endpoint) throw new Error('the provider advertises no token endpoint');

	const response = await fetch(metadata.token_endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${OIDC_M2M_CLIENT_ID}:${OIDC_M2M_CLIENT_SECRET}`)}`
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			// The resource indicator of the Management API, which is not its URL on self-hosted Logto
			resource: OIDC_M2M_RESOURCE ?? managementApiUrl(metadata.issuer),
			scope: 'all'
		}),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT)
	});
	if (!response.ok) throw await responseError('the Management API token request', response);
	const { access_token } = await response.json();
	if (typeof access_token !== 'string') throw new Error('the M2M token response has no token');
	return access_token;
}

/** A single-use subject token for `userId`, which the token exchange trades for their tokens. */
async function subjectTokenFor(userId: string): Promise<string> {
	const issuer = OIDC.core.configuration.serverMetadata().issuer;
	const response = await fetch(`${managementApiUrl(issuer)}/subject-tokens`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${await managementApiToken()}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ userId }),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT)
	});
	if (!response.ok) throw await responseError('the subject token request', response);
	const { subjectToken } = await response.json();
	if (typeof subjectToken !== 'string') throw new Error('the subject token response has no token');
	return subjectToken;
}

/**
 * Tokens for `userId`, delegated to whoever `actorAccessToken` belongs to, the way Logto
 * impersonates: a subject token from the Management API, exchanged (RFC 8693) with the actor's own
 * access token, so the issued token names the actor in its `act` claim. Checks no permissions;
 * `assertCanImpersonate` comes first.
 */
export async function impersonationTokens(
	actorAccessToken: string,
	userId: string
): Promise<ImpersonationTokens> {
	const tokens = await OIDC.core.exchangeToken({
		subjectToken: await subjectTokenFor(userId),
		actorToken: actorAccessToken,
		resource: OIDC_RESOURCE
	});
	return { access_token: tokens.access_token, id_token: tokens.id_token };
}
