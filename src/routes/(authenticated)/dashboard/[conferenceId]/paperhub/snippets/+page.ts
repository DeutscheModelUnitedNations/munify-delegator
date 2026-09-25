import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		snippets: await client.query.myReviewerSnippets({
			id: true,
			name: true,
			content: true,
			createdAt: true,
			updatedAt: true
		})
	};
};
