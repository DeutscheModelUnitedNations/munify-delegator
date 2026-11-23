import { OIDC_M2M_CLIENT_ID, OIDC_M2M_CLIENT_SECRET, OIDC_M2M_RESOURCE } from '$app/env/private';
import { logger } from '#lib/logger';
import { OIDC } from './OIDC';

/** Logto's Management API, reached with the machine-to-machine credentials. */

const REQUEST_TIMEOUT = 10_000;

/** Whether the deployment has the credentials for it. */
export function managementApiConfigured() {
	return !!OIDC_M2M_CLIENT_ID && !!OIDC_M2M_CLIENT_SECRET;
}

/** It lives next to the OIDC endpoints: the issuer minus `/oidc`, plus `/api`. */
function managementApiUrl(issuer: string) {
	return `${issuer.replace(/\/oidc\/?$/, '')}/api`;
}

export async function responseError({ what, response }: { what: string; response: Response }) {
	// The body is the provider's own error description; tokens are never echoed back in it.
	return new Error(`${what} failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
}

/** An access token for it, from the M2M app's client credentials. */
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
	if (!response.ok)
		throw await responseError({ what: 'the Management API token request', response });
	const { access_token } = await response.json();
	if (typeof access_token !== 'string') throw new Error('the M2M token response has no token');
	return access_token;
}

/** Calls it: `path` under its URL, `body` as JSON. */
export async function callManagementApi({
	path,
	method = 'GET',
	body
}: {
	path: string;
	method?: 'GET' | 'POST';
	body?: unknown;
}) {
	const { issuer } = OIDC.core.configuration.serverMetadata();
	return fetch(`${managementApiUrl(issuer)}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${await managementApiToken()}`,
			...(body === undefined ? {} : { 'Content-Type': 'application/json' })
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT)
	});
}

/** How long an answer about an account counts, so not every request asks again. */
const ACCOUNT_CHECK_MS = 10 * 60_000;
/** How long a provider that could not be asked is left alone. */
const UNKNOWN_MS = 60_000;
const accounts = new Map<string, { active: boolean; until: number }>();

/**
 * Whether an account still exists at the provider and is not suspended there, for what acts for
 * somebody without their signing in (a scanner). True while the provider cannot be asked: it does not
 * answer, or the deployment has no credentials for it.
 */
export async function isAccountActive(userId: string): Promise<boolean> {
	if (!managementApiConfigured()) return true;
	const known = accounts.get(userId);
	if (known && Date.now() < known.until) return known.active;
	const active = await askForAccount(userId);
	accounts.set(userId, {
		active: active ?? true,
		until: Date.now() + (active === undefined ? UNKNOWN_MS : ACCOUNT_CHECK_MS)
	});
	return active ?? true;
}

/** Whether the provider says an account is active; `undefined` when it cannot be asked. */
async function askForAccount(userId: string) {
	try {
		return await accountIn(
			await callManagementApi({ path: `/users/${encodeURIComponent(userId)}` })
		);
	} catch (error) {
		logger.warn('Asking the provider about an account failed', error);
		return undefined;
	}
}

/** What the provider's answer says of an account; `undefined` when it says nothing of it. */
async function accountIn(response: Response): Promise<boolean | undefined> {
	const body: unknown = await response.json().catch(() => undefined);
	if (typeof body !== 'object' || body === null) return undefined;
	if (response.ok) return !('isSuspended' in body && body.isSuspended === true);
	// Logto's own "there is no such user", not a provider without this endpoint
	const gone =
		response.status === 404 && 'code' in body && String(body.code).startsWith('entity.not');
	return gone ? false : undefined;
}
