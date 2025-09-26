import { graphqlYogaTracerPlugin } from './tracer';
import { createYoga } from 'graphql-yoga';
import { builder } from './builder';
import type { RequestEvent } from '@sveltejs/kit';
import { context } from '$api/context/context';
import { maskError } from './errors';

builder.queryType({});
builder.mutationType({});

import './modules/conference/conference';
import './modules/conference/plausibility';
import './modules/conference/certificateSignature';
import './modules/conference/statistics';
import './modules/conference/seed';
import './modules/auth';
import './modules/committee';
import './modules/committeeAgendaItem';
import './modules/conferenceParticipantStatus';
import './modules/conferenceSupervisor';
import './modules/customConferenceRole';
import './modules/delegation';
import './modules/delegationMember';
import './modules/impersonation';
import './modules/nation';
import './modules/nonStateActor';
import './modules/paymentTransaction';
import './modules/roleApplication';
import './modules/singleParticipant';
import './modules/teamMember';
import './modules/user';
import './modules/assignments';
import './modules/surveyQuestion';
import './modules/surveyOption';
import './modules/surveyAnswer';

export const yogaInstance = createYoga<RequestEvent>({
	plugins: [graphqlYogaTracerPlugin],
	schema: builder.toSchema(),
	graphqlEndpoint: '/api/graphql',
	fetchAPI: { Response },
	maskedErrors: {
		maskError
	},
	context
});
