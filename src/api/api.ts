import Elysia from 'elysia';
import { conference } from './routes/conference';
import { auth } from './routes/auth';
import { logger } from './logger';
import { health } from './routes/health';

export const app = new Elysia({
	normalize: true,
	prefix: '/api'
})
	.use(logger)
	.use(conference)
	.use(health)
	.use(auth)
	.compile();

export type App = typeof app;
