import { createYoga } from 'graphql-yoga';
import { schemabuilder } from './builder';
import type { RequestEvent } from '@sveltejs/kit';

schemabuilder.queryType({});
// schemabuilder.mutationType({});

import './conference';

export const yogaInstance = createYoga<RequestEvent>({
	schema: schemabuilder.toSchema(),
	graphqlEndpoint: '/api/graphql',
	fetchAPI: { Response }
});
