import { execute } from 'graphql';
import { getRequestEvent } from '$app/server';
import type { DocumentNode } from 'graphql';
import { GET } from '../routes/api/graphql/+server';

/**
 * The GraphQL entry point used during SSR.
 *
 * The urql client points at the relative path `/api/graphql`, which the browser resolves against
 * the current origin but Node cannot fetch. Rather than teaching the client an absolute URL and
 * forwarding cookies by hand, server-side operations run the schema in this process, reusing the
 * same envelop instance - and therefore the same context, auth and abilities - as the HTTP
 * endpoint.
 *
 * Deliberately a plain function and not a SvelteKit remote function, which is how chase does it.
 * Two things this app needs are forbidden inside one: a `command()` may not be called from a GET
 * handler, and the login callback mutates from its `load`; a `query()` may not set cookies, and
 * this app's OIDC context refreshes the token - writing cookies - while building the context for
 * any operation. Called directly there is no such restriction, and nothing has to be serialized
 * either, because caller and schema share a process.
 */
export async function performGraphQLOperation(request: {
	query: DocumentNode;
	variables?: Record<string, unknown>;
}) {
	const requestEvent = getRequestEvent();

	const envelop = GET.getEnveloped(requestEvent);
	const contextValue = envelop.contextFactory ? await envelop.contextFactory() : undefined;

	return execute({
		schema: envelop.schema,
		document: request.query,
		variableValues: request.variables,
		contextValue
	});
}
