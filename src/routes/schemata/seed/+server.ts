import type { RequestHandler } from './$types';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
import { z } from 'zod';

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(z.toJSONSchema(ConferenceSeedingSchema), null, 2));
};
