import { createYoga } from 'graphql-yoga';
import { builder } from './builder';
import type { RequestEvent } from '@sveltejs/kit';
import { context } from '$api/context/context';

builder.queryType({});
builder.mutationType({});

import './committee';
import './conference';
import './conferenceSupervisorRole';
import './customConferenceRole';
import './delegation';
import './delegationMember';
import './nation';
import './nonStateActor';
import './roleApplication';
import './singleParticipant';
import './teamMember';
import './user';

export const yogaInstance = createYoga<RequestEvent>({
	schema: builder.toSchema(),
	graphqlEndpoint: '/api/graphql',
	fetchAPI: { Response },
	context
});
