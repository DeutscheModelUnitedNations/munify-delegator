import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { protectedResourceMetadata, resourceOfMetadataPath } from '#api/mcp/auth';

/**
 * The MCP server's protected resource metadata (RFC 9728), at
 * `/.well-known/oauth-protected-resource/mcp` and, for clients that probe the origin, without the
 * path: it names the provider MCP clients sign in with.
 */
export const GET: RequestHandler = async ({ params }) => {
	const resource = resourceOfMetadataPath(params.path);
	if (!resource) error(404, 'Not found');
	return json(await protectedResourceMetadata(resource), {
		headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' }
	});
};
