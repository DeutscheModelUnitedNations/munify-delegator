import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { graphql } from '$houdini';
import { fastUserQuery } from '$lib/queries/fastUserQuery';

const getMessageRecipientsQuery = graphql(`
	query GetMessageRecipientsQuery($conferenceId: String!) {
		getMessageRecipients(conferenceId: $conferenceId) {
			id
			label
		}
	}
`);

const sendDelegationMessageMutation = graphql(`
	mutation SendDelegationMessageMutation(
		$conferenceId: String!
		$recipientId: String!
		$subject: String!
		$body: String!
		$replyUrl: String!
	) {
		sendDelegationMessage(
			conferenceId: $conferenceId
			recipientId: $recipientId
			subject: $subject
			body: $body
			replyUrl: $replyUrl
		)
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
		console.log('[Messaging] Fetching recipients for conference:', conferenceId);
		const result = await getMessageRecipientsQuery.fetch({
			event,
			variables: { conferenceId },
			blocking: true
		});

		console.log('[Messaging] Query result:', result);
		const recipients = result.data?.getMessageRecipients ?? [];
		console.log('[Messaging] Recipients found:', recipients.length);

		return {
			recipients
		};
	} catch (loadError) {
		console.error('Messaging recipients load error:', loadError);
		return {
			recipients: [],
			recipientLoadError: 'Unable to load recipients'
		};
	}
};

export const actions = {
	send: async (event) => {
		const conferenceId = event.params.conferenceId;
		if (!conferenceId) {
			return fail(400, { error: 'Missing conference id' });
		}

		const formData = await event.request.formData();
		const recipientIdValue = formData.get('recipientId');
		const subjectValue = formData.get('subject');
		const messageBodyValue = formData.get('body');

		if (
			typeof recipientIdValue !== 'string' ||
			typeof subjectValue !== 'string' ||
			typeof messageBodyValue !== 'string'
		) {
			return fail(400, { error: 'Missing fields' });
		}

		const recipientId = recipientIdValue.trim();
		const subject = subjectValue.trim();
		const messageBody = messageBodyValue;

		if (!recipientId || !subject || !messageBody.trim()) {
			return fail(400, { error: 'Missing fields' });
		}

		const { data } = await fastUserQuery.fetch({ event, blocking: true });
		const authUser = data?.offlineUserRefresh.user;
		if (!authUser?.sub) {
			return fail(401, { error: 'Unauthorized' });
		}

		if (recipientId === authUser.sub) {
			return fail(400, { error: 'Cannot send to yourself' });
		}

		const replySubject = `Re: ${subject}`;
		const replyUrl = `${event.url.origin}/dashboard/${conferenceId}/messaging/reply?recipientId=${encodeURIComponent(authUser.sub)}&subject=${encodeURIComponent(replySubject)}`;

		try {
			await sendDelegationMessageMutation.mutate(
				{
					conferenceId,
					recipientId,
					subject,
					body: messageBody,
					replyUrl
				},
				{ event }
			);

			return {
				status: 'ok'
			};
		} catch (sendError: unknown) {
			console.error('Message sending error:', sendError);
			const errorMessage =
				sendError && typeof sendError === 'object' && 'message' in sendError
					? String(sendError.message)
					: 'Failed to send message';
			return fail(500, { error: errorMessage });
		}
	}
} satisfies Actions;
