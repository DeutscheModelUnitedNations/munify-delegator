import { error } from '@sveltejs/kit';
import { validate } from 'graphql';
import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { yoga } from '#api/yoga';
import { formatError } from '#api/services/ssrErrors';

const graphqlRequestSchema = z.object({
	query: z.any(),
	variables: z.record(z.string(), z.any()).optional()
});

/**
 * Executes an operation in-process for the urql client during SSR (`ssrExchange` in
 * `#lib/api/client.ts`). It is a remote function only so that the server-side client can reach the
 * schema without an HTTP round trip; it is never meant to be called over HTTP, and refuses to be:
 * SvelteKit serves every `query` remote function as a `GET` endpoint, which would execute any
 * document a browser sends - mutations included, carried by a plain link with the visitor's
 * cookies - past yoga's request handling, graphql-armor, the introspection block and the error
 * masking that `/api/graphql` has.
 */
export const graphqlOperation = query(graphqlRequestSchema, async (request) => {
	const requestEvent = getRequestEvent();
	if (requestEvent.isRemoteRequest) error(404, 'Not found');

	const envelop = yoga.getEnveloped(requestEvent);
	const validationErrors = validate(envelop.schema, request.query);
	if (validationErrors.length) return { errors: validationErrors.map(formatError) };

	const contextValue = envelop.contextFactory ? await envelop.contextFactory() : undefined;

	// Through envelop rather than graphql's `execute`, so the yoga plugins (`databaseRuleError`)
	// see the result as they do on `/api/graphql`.
	const result = await envelop.execute({
		schema: envelop.schema,
		document: request.query,
		variableValues: request.variables,
		contextValue
	});
	if (Symbol.asyncIterator in result) error(500, 'Incremental delivery is not supported here');

	return { data: result.data, errors: result.errors?.map(formatError) };
});
