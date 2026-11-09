import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorizationServerMetadata, mcpResourceUrl } from '#api/mcp/auth';

/**
 * The provider's metadata, for MCP clients of the 2025-03 revision, which look for the
 * authorization server on the MCP server's own origin instead of reading the protected resource
 * metadata. Only while the MCP server is on.
 */
export const GET: RequestHandler = async () => {
	if (!mcpResourceUrl()) error(404, 'Not found');
	return json(await authorizationServerMetadata(), {
		headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' }
	});
};
