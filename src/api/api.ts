import Elysia from 'elysia';
import { conference } from './routes/conference';
import { auth } from './routes/auth';
import { logger } from './logger';

export const app = new Elysia({
	normalize: true,
	prefix: '/api'
})
	.use(logger)
	.use(conference)
	.use(auth);

export type App = typeof app;
