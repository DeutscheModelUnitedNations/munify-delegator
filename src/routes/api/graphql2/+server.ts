// TEMPORARY: proves the rumble stack serves alongside the legacy Pothos endpoint.
import { createYoga } from '$api/rumble';
import { dev } from '$app/environment';

import '$api/handlers/register';

const yogaInstance = createYoga({
	graphqlEndpoint: '/api/graphql2',
	maskedErrors: !dev,
	fetchAPI: {
		fetch,
		Request,
		Response,
		Headers,
		FormData,
		ReadableStream,
		WritableStream,
		TransformStream,
		Blob,
		crypto,
		btoa,
		TextEncoder,
		TextDecoder,
		URLPattern,
		URL,
		URLSearchParams
	}
});

export { yogaInstance as GET, yogaInstance as POST, yogaInstance as OPTIONS };
