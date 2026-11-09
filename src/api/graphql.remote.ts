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

type Enveloped = ReturnType<typeof yoga.getEnveloped>;

const contexts = new WeakMap<App.Locals, Promise<unknown>>();

/**
 * One context for every operation a page render runs. rumble prepares a table's abilities once
 * per context, and a page renders a few dozen operations at once: with a context each, the user
 * read rules (eleven relational lookups) ran ten times in parallel for one dashboard render and
 * took 0.7 s each. Every remote call sees its own copy of the request event, but they all share
 * its `locals`. SSR only reads, so no operation needs the abilities refreshed after a write.
 */
function sharedContext({ locals, envelop }: { locals: App.Locals; envelop: Enveloped }) {
	let context = contexts.get(locals);
	if (!context) {
		context = Promise.resolve(envelop.contextFactory());
		contexts.set(locals, context);
	}
	return context;
}

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

	const contextValue = await sharedContext({ locals: requestEvent.locals, envelop });

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
