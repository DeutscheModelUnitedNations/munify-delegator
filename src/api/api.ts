import Elysia from 'elysia';
import { conference } from './routes/conference';
import { auth } from './routes/auth';
import { logger } from './util/logger';
import { health } from './routes/health';
import { user } from './routes/user';

export const app = new Elysia({
	normalize: true,
	prefix: '/api'
})
	.use(logger)
	.use(conference)
	.use(health)
	.use(auth)
	.use(user)
	.compile();

export type App = typeof app;
