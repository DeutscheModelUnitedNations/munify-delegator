/**
 * Prints an access token for the local MCP server (`bun run mcp:token <dev account>`), for
 * connecting an MCP client by hand while the dev server runs:
 *
 *   claude mcp add --transport http delegator http://localhost:5173/mcp \
 *     --header "Authorization: Bearer $(bun run --silent mcp:token dev-team-pm)"
 *
 * oidc-mock has no dynamic client registration, so MCP clients cannot sign in against it on their
 * own the way they do against Logto. This takes the route impersonation takes (an M2M token, a
 * subject token for the account, a token exchange) and asks for a token for `MCP_RESOURCE`.
 */
import { z } from 'zod';

const sub = process.argv[2];
if (!sub) {
	console.error('Usage: bun run mcp:token <sub of a dev account, e.g. dev-team-pm>');
	process.exit(1);
}

const resource = process.env.MCP_RESOURCE ?? 'http://localhost:5173/mcp';
const issuer = 'http://127.0.0.1:8090/oidc';
const tokenSchema = z.object({ access_token: z.string() });

async function post({
	url,
	body,
	bearer
}: {
	url: string;
	body: string | URLSearchParams;
	bearer?: string;
}) {
	const response = await fetch(url, {
		method: 'POST',
		body,
		headers: {
			...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
			...(typeof body === 'string' ? { 'content-type': 'application/json' } : {})
		}
	});
	if (!response.ok) throw new Error(`${url} answered ${response.status}: ${await response.text()}`);
	return response.json();
}

const m2m = tokenSchema.parse(
	await post({
		url: `${issuer}/token`,
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: 'delegator',
			resource: 'http://127.0.0.1:8090/api'
		})
	})
).access_token;

const { subjectToken } = z.object({ subjectToken: z.string() }).parse(
	await post({
		url: 'http://127.0.0.1:8090/api/subject-tokens',
		body: JSON.stringify({ userId: sub }),
		bearer: m2m
	})
);

const { access_token } = tokenSchema.parse(
	await post({
		url: `${issuer}/token`,
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
			client_id: 'delegator',
			subject_token: subjectToken,
			subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
			resource
		})
	})
);

console.info(access_token);
