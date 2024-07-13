import { apiClient } from '$api/client';

/**
 * Helper function to provide typesafe, correct and easy access to the API.
 * Injects the correct url based on the sveltekit handler parameters so it works
 * in SSR and client-side.
 */
export const loadApiHandler =
	<Ret, InputParameters extends { fetch: typeof fetch; url: URL }>(
		caller: (
			parameters: Omit<InputParameters, 'fetch'> & { api: ReturnType<typeof apiClient> }
		) => Ret
	): ((p: InputParameters) => Ret) =>
	(p: InputParameters): Ret => {
		return caller({ ...p, api: apiClient({ origin: p.url.origin, fetch }) });
	};
