import type { RequestHandler } from './$types';
import { mcpPreflight, serveMcp } from '#api/mcp/endpoint';

// The MCP server for AI assistants (`src/api/mcp/`).
export const POST: RequestHandler = (event) => serveMcp(event);
export const GET: RequestHandler = (event) => serveMcp(event);
export const DELETE: RequestHandler = (event) => serveMcp(event);
export const OPTIONS: RequestHandler = () => mcpPreflight();
