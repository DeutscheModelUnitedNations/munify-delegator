import { apiClient, checkForError } from "$api/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
	const conferences = await checkForError(apiClient(fetch).conference.get());
	return { conferences };
};
