import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { graphql } from '$houdini';

const getInboxMessagesQuery = graphql(`
	query GetInboxMessagesQuery($conferenceId: String!) {
		getInboxMessages(conferenceId: $conferenceId) {
			id
			senderLabel
			subject
			body
			sentAt
			hasThread
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
		const result = await getInboxMessagesQuery.fetch({
			event,
			variables: { conferenceId },
			blocking: true
		});

		const items = result.data?.getInboxMessages ?? [];

		return {
			items
		};
	} catch (inboxError) {
		console.error('Inbox load error:', inboxError);
		return {
			items: [],
			inboxLoadError: 'Unable to load inbox'
		};
	}
};
