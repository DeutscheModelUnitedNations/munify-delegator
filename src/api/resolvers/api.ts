import { createYoga } from 'graphql-yoga';
import { builder } from './builder';
import type { RequestEvent } from '@sveltejs/kit';
import { context } from '$api/context/context';

builder.queryType({});
builder.mutationType({});

import './modules/conference/conference';
import './modules/conference/plausibility';
import './modules/conference/statistics';
import './modules/auth';
import './modules/committee';
import './modules/conferenceParticipantStatus';
import './modules/conferenceSupervisor';
import './modules/customConferenceRole';
import './modules/delegation';
import './modules/delegationMember';
import './modules/nation';
import './modules/nonStateActor';
import './modules/roleApplication';
import './modules/singleParticipant';
import './modules/teamMember';
import './modules/user';

export const yogaInstance = createYoga<RequestEvent>({
	schema: builder.toSchema(),
	graphqlEndpoint: '/api/graphql',
	fetchAPI: { Response },
	context
});
