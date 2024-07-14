import Elysia, { t } from 'elysia';

export const auth = new Elysia().get('/health/ready', async () => true);
