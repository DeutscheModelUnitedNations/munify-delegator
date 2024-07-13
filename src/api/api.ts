import Elysia from 'elysia';
import { conference } from './routes/conference';
import { auth } from './routes/auth';

export const app = new Elysia({
	normalize: true,
	prefix: '/api'
})
	.use(conference)
	.use(auth);

export type App = typeof app;
