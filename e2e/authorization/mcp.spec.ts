import { test, expect } from '../support/test';
import { callTool, ISSUER, mcpToken } from '../support/mcp';
import pg from 'pg';
import {
	E2E_MCP_CARE_ID,
	E2E_MCP_CONFERENCE_ID,
	E2E_MCP_DELEGATE_FAMILY_NAME,
	E2E_MCP_DELEGATE_ID,
	E2E_MCP_OFF_CONFERENCE_ID
} from '../seed/mcp';

// The MCP server for AI assistants (src/api/mcp/): it acts with the caller's own abilities, only in
// conferences that switched it on, and no personal data reaches the assistant - not in answers,
// not through filters. The token comes the way the mock offers it (a subject token exchanged for
// one for the MCP resource), since oidc-mock has no dynamic client registration.

test.describe('MCP server', () => {
	let token: string;

	test.beforeAll(async ({ playwright, baseURL }) => {
		// the e2e server's certificate is self-signed (playwright.config.ts)
		const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
		token = await mcpToken(request, E2E_MCP_CARE_ID, new URL('/mcp', baseURL).href);
		await request.dispose();
	});

	test('asks for a token and names where to get one', async ({ request }) => {
		const response = await request.post('/mcp', {
			data: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
		});
		expect(response.status()).toBe(401);
		expect(response.headers()['www-authenticate']).toContain(
			'/.well-known/oauth-protected-resource/mcp'
		);
		const metadata = await (await request.get('/.well-known/oauth-protected-resource/mcp')).json();
		expect(metadata.authorization_servers).toEqual([ISSUER]);
	});

	test('lists only the conferences that switched assistants on', async ({ request }) => {
		const { text } = await callTool({ request, token, name: 'whoami', args: {} });
		const ids = JSON.parse(text).conferences.map((conference: { id: string }) => conference.id);
		expect(ids).toContain(E2E_MCP_CONFERENCE_ID);
		expect(ids).not.toContain(E2E_MCP_OFF_CONFERENCE_ID);
	});

	test('answers without personal data', async ({ request }) => {
		const { text, isError } = await callTool({
			request,
			token,
			name: 'graphql_query',
			args: {
				conferenceId: E2E_MCP_CONFERENCE_ID,
				query: `{ conferenceParticipants(where: { conferenceId: { eq: "${E2E_MCP_CONFERENCE_ID}" } }) {
					userId paymentStatus
					user { givenName familyName email phone globalNotes country }
					delegationMember { delegation { motivation entryCode memberCount } }
				} }`
			}
		});
		expect(isError).toBe(false);
		expect(text).not.toContain(E2E_MCP_DELEGATE_FAMILY_NAME);
		expect(text).not.toContain('Notiz');
		expect(text).not.toContain('MCPCODE1');
		expect(text).not.toContain('Motivation');
		const [row] = JSON.parse(text).conferenceParticipants.filter(
			(participant: { userId: string }) => participant.userId === E2E_MCP_DELEGATE_ID
		);
		expect(row.user).toEqual({
			givenName: '[redacted]',
			familyName: '[redacted]',
			email: '[redacted]',
			phone: '[redacted]',
			globalNotes: '[redacted]',
			country: 'DEU'
		});
	});

	test('refuses to filter by personal data', async ({ request }) => {
		const { text, isError } = await callTool({
			request,
			token,
			name: 'graphql_query',
			args: {
				conferenceId: E2E_MCP_CONFERENCE_ID,
				query: `{ users(where: { familyName: { eq: "${E2E_MCP_DELEGATE_FAMILY_NAME}" } }) { id } }`
			}
		});
		expect(isError).toBe(true);
		expect(text).toContain('personal data');
	});

	test('refuses a conference that did not switch assistants on', async ({ request }) => {
		const { isError } = await callTool({
			request,
			token,
			name: 'participant_overview',
			args: { conferenceId: E2E_MCP_OFF_CONFERENCE_ID }
		});
		expect(isError).toBe(true);
	});

	test('changes what the caller may change, and logs it', async ({ request }) => {
		const { isError } = await callTool({
			request,
			token,
			name: 'upsertConferenceParticipant',
			args: {
				conferenceId: E2E_MCP_CONFERENCE_ID,
				userId: E2E_MCP_DELEGATE_ID,
				paymentStatus: 'DONE'
			}
		});
		expect(isError).toBe(false);

		const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
		await client.connect();
		try {
			const { rows } = await client.query(
				'SELECT tool, outcome, user_id FROM mcp_audit_entry WHERE conference_id = $1 AND tool = $2',
				[E2E_MCP_CONFERENCE_ID, 'upsertConferenceParticipant']
			);
			expect(rows).toContainEqual({
				tool: 'upsertConferenceParticipant',
				outcome: 'OK',
				user_id: E2E_MCP_CARE_ID
			});
		} finally {
			await client.end();
		}
	});
});
