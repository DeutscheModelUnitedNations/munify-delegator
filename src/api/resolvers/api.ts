import { createYoga } from 'graphql-yoga';
import { builder } from './builder';
import type { RequestEvent } from '@sveltejs/kit';
import { context } from '$api/context/context';

builder.queryType({});
builder.mutationType({});

import './conference';
import './committee';
import './user';

export const yogaInstance = createYoga<RequestEvent>({
	schema: builder.toSchema(),
	graphqlEndpoint: '/api/graphql',
	fetchAPI: { Response },
	context,
});
