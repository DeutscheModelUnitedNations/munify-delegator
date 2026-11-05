import {
	bearerAuthChallengeResponse,
	createMcpHandler,
	getOAuthProtectedResourceMetadataUrl,
	verifyBearerToken
} from '@modelcontextprotocol/server';
import { error, type RequestEvent } from '@sveltejs/kit';
import { runWithLocale } from '#api/services/requestLocale';
import { mcpPrincipalSchema, mcpResourceUrl, verifyMcpAccessToken } from './auth';
import { createMcpServer } from './server';

/**
 * `/mcp`: the MCP server's HTTP endpoint (Streamable HTTP, stateless). Each request carries the
 * assistant's bearer token; without a valid one the answer is a 401 challenge naming the
 * protected resource metadata, which is how clients find out where to sign in.
 *
 * It answers any origin: it reads no cookies, only the bearer token, so a browser-based client
 * (the MCP Inspector) gets nothing a page could not get without it.
 */

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers':
		'Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
	'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id'
};

function withCors(response: Response) {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

/** The CORS preflight. */
export function mcpPreflight() {
	if (!mcpResourceUrl()) error(404, 'Not found');
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Serves one MCP request. */
export async function serveMcp(event: RequestEvent) {
	const resource = mcpResourceUrl();
	if (!resource) error(404, 'Not found');
	const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(resource);

	let authInfo;
	try {
		authInfo = await verifyBearerToken(event.request.headers.get('authorization'), {
			verifier: { verifyAccessToken: (token) => verifyMcpAccessToken({ token, resource }) },
			expectedResource: resource,
			resourceMetadataUrl
		});
	} catch (failure) {
		return withCors(bearerAuthChallengeResponse(failure, { resourceMetadataUrl }));
	}
	const principal = mcpPrincipalSchema.parse(authInfo.extra);

	const handler = createMcpHandler(
		() => createMcpServer({ event, principal, clientId: authInfo.clientId }),
		{ responseMode: 'json' }
	);
	// The API words its errors for whoever asks; an assistant reads English best.
	const response = await runWithLocale({
		locale: 'en',
		fn: () => handler.fetch(event.request, { authInfo })
	});
	return withCors(response);
}
