import { createYoga } from '$api/rumble';
import { dev } from '$app/environment';

import '$api/handlers/register';

const yogaInstance = createYoga({
	graphqlEndpoint: '/api/graphql',
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
