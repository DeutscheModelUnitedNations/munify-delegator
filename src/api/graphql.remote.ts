import { execute } from 'graphql';
import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { yoga } from '$api/yoga';

/**
 * The GraphQL entry point used during SSR.
 *
 * The urql client points at the relative path `/api/graphql`, which the browser resolves against
 * the current origin but Node cannot fetch. Rather than teaching the client an absolute URL and
 * forwarding cookies by hand, server-side operations run the schema in this process, reusing the
 * same envelop instance - and therefore the same context, auth and abilities - as the HTTP
 * endpoint.
 *
 * It has to be a remote function: `src/lib/api/client.ts` is shared with the browser, and only a
 * remote import is replaced by a stub in the client bundle. Importing this module directly would
 * drag `$env/dynamic/private` into the browser graph, which SvelteKit refuses to build.
 */
const graphqlRequestSchema = z.object({
	query: z.any(),
	variables: z.record(z.string(), z.any()).optional()
});

/**
 * Deliberately a `query()` and not a `command()`, for mutations too: a command may not be called
 * from a GET handler, and the login callback upserts the signed-in user from its `load`, so a
 * command makes logging in fail outright. Nothing is cached - the schema runs on every call.
 *
 * The one thing a `query()` cannot do is set cookies. That only shows up when the OIDC context
 * refreshes an expiring token while serving an SSR operation: the refreshed token is used for
 * that request but not persisted, so the next request refreshes again. Fixing it properly means
 * moving the refresh into a server `handle` hook, which is free to write cookies.
 */
export const graphqlOperation = query(graphqlRequestSchema, async (request) => {
	const requestEvent = getRequestEvent();

	const envelop = yoga.getEnveloped(requestEvent);
	const contextValue = envelop.contextFactory ? await envelop.contextFactory() : undefined;

	return execute({
		schema: envelop.schema,
		document: request.query,
		variableValues: request.variables,
		contextValue
	});
});
