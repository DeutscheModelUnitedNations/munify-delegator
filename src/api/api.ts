import Elysia from 'elysia';
import { conference } from './routes/conference';
import { auth } from './routes/auth';
import { logger } from './util/logger';
import { health } from './routes/health';
import { user } from './routes/user';
import { conferenceNation } from './routes/conferenceNation';
import { conferenceNonStateActor } from './routes/conferenceNonStateActor';
import { customConferenceRole } from './routes/customConferenceRole';
import { delegation } from './routes/delegation';
import { delegationApplication } from './routes/delegationApplication';
import { delegationMember } from './routes/delegationMember';
import { nation } from './routes/nation';
import { nonStateActor } from './routes/nonStateActor';

export const app = new Elysia({
	normalize: true,
	prefix: '/api'
})
	.use(auth)
	.use(conference)
	.use(conferenceNation)
	.use(conferenceNonStateActor)
	.use(customConferenceRole)
	.use(delegation)
	.use(delegationApplication)
	.use(delegationMember)
	.use(health)
	.use(nation)
	.use(nonStateActor)
	.use(logger)
	.use(user)
	.compile();

export type App = typeof app;
