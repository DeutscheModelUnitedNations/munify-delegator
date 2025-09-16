import type { RequestHandler } from './$types';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(zodToJsonSchema(ConferenceSeedingSchema), null, 2));
};
