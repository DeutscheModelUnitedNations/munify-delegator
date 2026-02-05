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
import './modules/messageAudit';
import './modules/nation';
import './modules/nonStateActor';
import './modules/paymentTransaction';
import './modules/paper/paper';
import './modules/paper/paperReview';
import './modules/paper/paperVersion';
import './modules/paper/reviewerLeaderboard';
import './modules/reviewerSnippet';
import './modules/flagCollection';
import './modules/roleApplication';
import './modules/singleParticipant';
import './modules/teamMember';
import './modules/teamMemberInvitation';
import './modules/user';
import './modules/assignments';
import './modules/survey/surveyQuestion';
import './modules/survey/surveyOption';
import './modules/survey/surveyAnswer';
import './modules/waitingListEntry';

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
