import Elysia from 'elysia';
import { conference } from './routes/conference';
import { auth } from './routes/auth';
import { logger } from './util/logger';
import { health } from './routes/health';
import { user } from './routes/user';
import { committee } from './routes/committee';
import { conferenceParticipantStatus } from './routes/conferenceParticipantStatus';
import { conferenceSupervisor } from './routes/conferenceSupervisor';
import { customConferenceRole } from './routes/customConferenceRole';
import { delegation } from './routes/delegation';
import { delegationMember } from './routes/delegationMember';
import { nation } from './routes/nation';
import { nonStateActor } from './routes/nonStateActor';
import { roleApplication } from './routes/roleApplication';
import { singleParticipant } from './routes/singleParticipant';
import { teamMember } from './routes/teamMember';

// since the type elysia produces is too big and fails the TS compiler, we need to ignore the error
// this does not affect the eden client
// @ts-ignore
export const app = new Elysia({
	normalize: true,
	prefix: '/api'
})
	.use(committee)
	.use(conference)
	// .use(conferenceSupervisor)
	// .use(conferenceParticipantStatus)
	// .use(auth)
	// .use(logger)
	// .use(customConferenceRole)
	.use(delegation)
	// .use(delegationMember)
	// .use(health)
	// .use(nation)
	// .use(nonStateActor)
	// .use(roleApplication)
	// .use(singleParticipant)
	// .use(teamMember)
	.use(user)
	.compile();

export type App = typeof app;
