import { execute } from 'graphql';
import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { yoga } from '#api/yoga.js';

const graphqlRequestSchema = z.object({
	query: z.any(),
	variables: z.record(z.string(), z.any()).optional()
});

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
