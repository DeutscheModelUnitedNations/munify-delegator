import type { RequestHandler } from './$types';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
import { z } from 'zod';

export const GET: RequestHandler = () => {
	// `io: 'input'` describes the file an author writes, before any transform is
	// applied, which is what an editor validating against this schema needs.
	const jsonSchema = z.toJSONSchema(ConferenceSeedingSchema, { io: 'input' });

	return new Response(JSON.stringify(jsonSchema, null, 2), {
		headers: { 'Content-Type': 'application/json' }
	});
};
