import { apiClient } from '$api/client';
let api = $state<ReturnType<typeof apiClient> | undefined>(undefined);

export function setApi(newApi: ReturnType<typeof apiClient>) {
	api = newApi;
}

export function getApi() {
	if (api === undefined) {
		throw new Error('API not set');
	}
	return api;
}

export type APIType = ReturnType<typeof getApi>;
