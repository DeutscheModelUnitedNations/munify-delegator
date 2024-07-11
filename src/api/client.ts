import { treaty } from "@elysiajs/eden";
import type { App } from "./api";

export function apiClient(
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
	return (treaty<App>("/api", {
		fetcher: fetch,
	})).api;
}

/**
 * Helper for throwing errors if the response contains an error
 *
 * @param apiCall An api call to the api
 * @returns The data inside the response
 * @throws An error if the response contains an error
 */
export async function checkForError<T, E>(
  apiCall: Promise<{
    data: T | null;
    error: E | null;
  }>,
) {
  const response = await apiCall;
  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }
  if (response.data === null) {
    throw new Error("Invalid state: Response data is null");
  }
  return response.data;
}
