import type { RequestHandler } from './$types';
import { committeeSeedSchema } from '$lib/seeding/seedSchema';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(zodToJsonSchema(committeeSeedSchema), null, 2));
};
