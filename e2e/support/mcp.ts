import type { APIRequestContext } from '@playwright/test';
import { expect } from './test';

/**
 * Talking to the MCP server (src/api/mcp/) as an AI assistant would. The token comes the way the
 * mock offers it (a subject token exchanged for one for the MCP resource), since oidc-mock has no
 * dynamic client registration.
 */

export const ISSUER = 'http://127.0.0.1:8090/oidc';

export async function mcpToken(request: APIRequestContext, sub: string, resource: string) {
	const m2m = await request.post(`${ISSUER}/token`, {
		form: {
			grant_type: 'client_credentials',
			client_id: 'delegator',
			resource: 'http://127.0.0.1:8090/api'
		}
	});
	const subject = await request.post('http://127.0.0.1:8090/api/subject-tokens', {
		headers: { authorization: `Bearer ${(await m2m.json()).access_token}` },
		data: { userId: sub }
	});
	const exchanged = await request.post(`${ISSUER}/token`, {
		form: {
			grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
			client_id: 'delegator',
			subject_token: (await subject.json()).subjectToken,
			subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
			resource
		}
	});
	const { access_token } = await exchanged.json();
	return String(access_token);
}

/** One JSON-RPC request to `/mcp`, answering its result. */
async function rpc({
	request,
	token,
	method,
	params
}: {
	request: APIRequestContext;
	token: string;
	method: string;
	params: Record<string, unknown>;
}) {
	const response = await request.post('/mcp', {
		headers: {
			authorization: `Bearer ${token}`,
			accept: 'application/json, text/event-stream',
			'mcp-protocol-version': '2025-06-18'
		},
		data: { jsonrpc: '2.0', id: 1, method, params }
	});
	expect(response.status()).toBe(200);
	const body = await response.text();
	// The stateless 2025 transport answers as one server-sent event
	return JSON.parse(body.startsWith('{') ? body : (/^data: (.*)$/m.exec(body)?.[1] ?? '{}'));
}

/** Calls a tool and answers its text, and whether it was an error. */
export async function callTool({
	request,
	token,
	name,
	args
}: {
	request: APIRequestContext;
	token: string;
	name: string;
	args: Record<string, unknown>;
}) {
	const json = await rpc({
		request,
		token,
		method: 'tools/call',
		params: { name, arguments: args }
	});
	return {
		text: String(json.result?.content?.[0]?.text ?? json.error?.message),
		isError: Boolean(json.result?.isError ?? json.error)
	};
}

/** The tools the server offers, with their hints. */
export async function listTools({ request, token }: { request: APIRequestContext; token: string }) {
	const json = await rpc({ request, token, method: 'tools/list', params: {} });
	const tools: { name: string; annotations?: Record<string, boolean> }[] = json.result?.tools ?? [];
	return tools;
}
