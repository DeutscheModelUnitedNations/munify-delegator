import type { RequestHandler } from './$types';
import { chasePresenceSchema } from '#lib/schemata/chasePresence.js';
import { z } from 'zod';

export const GET: RequestHandler = () => {
	const jsonSchema = z.toJSONSchema(chasePresenceSchema, { io: 'input' });

	return new Response(JSON.stringify(jsonSchema, null, 2), {
		headers: { 'Content-Type': 'application/json' }
	});
};
