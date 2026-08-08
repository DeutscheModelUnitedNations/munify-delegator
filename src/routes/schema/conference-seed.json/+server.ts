import type { RequestHandler } from './$types';
import { conferenceSeedingJsonSchemaResponse } from '$lib/seeding/seedSchema';

export const GET: RequestHandler = () => {
	return conferenceSeedingJsonSchemaResponse();
};
