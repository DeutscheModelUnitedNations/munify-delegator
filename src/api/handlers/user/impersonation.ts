import type { ImpersonationTokens } from '@m1212e/sveltekit-oidc';
import { OIDC_RESOURCE } from '$app/env/private';
import { OIDC } from '#api/services/oidc/OIDC';
import {
	callManagementApi,
	managementApiConfigured,
	responseError
} from '#api/services/oidc/managementApi';
import { actorAccessTokenOf } from '#api/services/oidc/actorToken';
import type { RequestEvent } from '@sveltejs/kit';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { logger } from '#lib/logger';

// TODO: Logto-only. Make the subject token step an adapter per provider (Logto, Zitadel), picked
// from the discovery document's endpoint paths, with an optional `OIDC_IMPERSONATION` override.

/** Whether the deployment has the Management API credentials impersonation needs. */
export const impersonationConfigured = managementApiConfigured;

/** A single-use subject token for `userId`, which the token exchange trades for their tokens. */
async function subjectTokenFor(userId: string): Promise<string> {
	const response = await callManagementApi({
		path: '/subject-tokens',
		method: 'POST',
		body: { userId }
	});
	if (!response.ok) throw await responseError({ what: 'the subject token request', response });
	const { subjectToken } = await response.json();
	if (typeof subjectToken !== 'string') throw new Error('the subject token response has no token');
	return subjectToken;
}

/**
 * Tokens for `userId`, delegated to the person signed in on `event`, the way Logto impersonates:
 * a subject token from the Management API, exchanged (RFC 8693) with the actor's own access token,
 * so the issued token names the actor in its `act` claim. Logto accepts only a plain access token
 * as the actor's, not the session's resource JWT (`actorAccessTokenOf`). Checks no permissions;
 * `assertCanImpersonate` comes first.
 */
async function impersonationTokens({
	event,
	userId
}: {
	event: RequestEvent;
	userId: string;
}): Promise<ImpersonationTokens> {
	const [subjectToken, actorToken] = await Promise.all([
		subjectTokenFor(userId),
		actorAccessTokenOf(event)
	]);
	const tokens = await OIDC.core.exchangeToken({
		subjectToken,
		actorToken,
		resource: OIDC_RESOURCE
	});
	return { access_token: tokens.access_token, id_token: tokens.id_token };
}

/**
 * Starts acting as `targetId` in the session of `event`: tokens delegated to the actor, kept by the
 * OIDC library next to the actor's own session. Refuses (FORBIDDEN) when the deployment lacks the
 * Management API credentials, and (CONFLICT) when the provider does not issue the tokens. Checks no
 * permissions; `assertCanImpersonate` comes first.
 */
export async function startImpersonation({
	event,
	actorId,
	targetId
}: {
	event: RequestEvent;
	actorId: string;
	targetId: string;
}) {
	if (!impersonationConfigured()) {
		throw apiError({ code: 'FORBIDDEN', message: m.impersonationNotConfigured() });
	}
	if (!event.locals.oidc) throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });

	try {
		const tokens = await impersonationTokens({ event, userId: targetId });
		await OIDC.startImpersonation(event, tokens);
	} catch (error) {
		logger.warn('Impersonation failed to start', {
			actor: actorId,
			subject: targetId,
			reason: error instanceof Error ? error.message : String(error)
		});
		throw apiError({ code: 'CONFLICT', message: m.impersonationFailed() });
	}
	logger.info('Impersonation started', { actor: actorId, subject: targetId });
}

/** Puts the session of `event` back to the actor's own; nothing changes outside an impersonation. */
export function stopImpersonation({
	event,
	actorId,
	targetId
}: {
	event: RequestEvent;
	actorId: string | undefined;
	targetId: string | undefined;
}) {
	OIDC.stopImpersonation(event);
	if (actorId) logger.info('Impersonation stopped', { actor: actorId, subject: targetId });
}
