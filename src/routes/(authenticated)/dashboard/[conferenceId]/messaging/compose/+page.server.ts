import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { graphql } from '$houdini';

const getMessageRecipientsQuery = graphql(`
	query GetMessageRecipientsQuery($conferenceId: String!) {
		getMessageRecipients(conferenceId: $conferenceId) {
			groupId
			groupLabel
			category
			fontAwesomeIcon
			recipients {
				id
				label
				firstName
				lastName
				alpha2Code
				alpha3Code
				fontAwesomeIcon
				roleName
			}
		}
	}
`);

const getMessageForReplyQuery = graphql(`
	query GetMessageForReplyQuery($messageAuditId: String!, $conferenceId: String!) {
		getMessageForReply(messageAuditId: $messageAuditId, conferenceId: $conferenceId) {
			id
			subject
			body
			senderLabel
			senderUserId
			senderFirstName
			senderLastName
			senderAlpha2Code
			senderAlpha3Code
			senderFontAwesomeIcon
			senderRoleName
			sentAt
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

	const replyToId = event.url.searchParams.get('replyTo');

	try {
		const result = await getMessageRecipientsQuery.fetch({
			event,
			variables: { conferenceId },
			blocking: true
		});

		const recipientGroups = result.data?.getMessageRecipients ?? [];

		if (replyToId) {
			const replyResult = await getMessageForReplyQuery.fetch({
				event,
				variables: { messageAuditId: replyToId, conferenceId },
				blocking: true
			});
			return {
				recipientGroups,
				replyToMessage: replyResult.data?.getMessageForReply ?? null
			};
		}

		return {
			recipientGroups,
			replyToMessage: null as null
		};
	} catch (loadError) {
		console.error('Messaging recipients load error:', loadError);
		return {
			recipientGroups: [],
			replyToMessage: null,
			recipientLoadError: 'Unable to load recipients'
		};
	}
};
