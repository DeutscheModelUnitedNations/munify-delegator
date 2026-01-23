import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { graphql } from '$houdini';

const getMessageHistoryQuery = graphql(`
	query GetMessageHistoryQuery($conferenceId: String!) {
		getMessageHistory(conferenceId: $conferenceId) {
			recipientLabel
			subject
			sentAt
			status
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	const userId = parent.user?.sub;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const conferenceId = event.params.conferenceId;
	if (!conferenceId) {
		throw error(400, 'Missing conference id');
	}

	try {
		const result = await getMessageHistoryQuery.fetch({
			event,
			variables: { conferenceId },
			blocking: true
		});

		const items = result.data?.getMessageHistory ?? [];

		return {
			items
		};
	} catch (historyError) {
		console.error('Messaging history load error:', historyError);
		return {
			items: [],
			historyLoadError: 'Unable to load history'
		};
	}
};
