import Elysia from 'elysia';

export const health = new Elysia().get('/health/ready', async () => true);
