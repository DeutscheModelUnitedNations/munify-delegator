import { execute } from 'graphql';
import { z } from 'zod';
import { command, getRequestEvent, query } from '$app/server';
import { GET } from '../routes/api/graphql/+server';

/**
 * The GraphQL entry point used during SSR.
 *
 * The urql client points at the relative path `/api/graphql`, which the browser resolves
 * against the current origin but Node cannot fetch. Rather than teaching the client an absolute
 * URL and forwarding cookies by hand, server-side operations run the schema in this process,
 * reusing the same envelop instance - and therefore the same context, auth and abilities - as
 * the HTTP endpoint.
 */
const graphqlRequestSchema = z.object({
	query: z.any(),
	variables: z.record(z.string(), z.any()).optional()
});

const performOperation = async (request: z.infer<typeof graphqlRequestSchema>) => {
	const requestEvent = getRequestEvent();

	const envelop = GET.getEnveloped(requestEvent);
	const contextValue = envelop.contextFactory ? await envelop.contextFactory() : undefined;

	return execute({
		schema: envelop.schema,
		document: request.query,
		variableValues: request.variables,
		contextValue
	});
};

export const graphqlQuery = query(graphqlRequestSchema, performOperation);
export const graphqlMutation = command(graphqlRequestSchema, performOperation);
