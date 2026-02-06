import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { graphql } from '$houdini';
import { fastUserQuery } from '$lib/queries/fastUserQuery';

const getMessageRecipientsQuery = graphql(`
	query GetReplyMessageRecipientsQuery($conferenceId: String!) {
		getMessageRecipients(conferenceId: $conferenceId) {
			id
			label
		}
	}
`);

const sendDelegationMessageMutation = graphql(`
	mutation SendReplyMessageMutation(
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

	const recipientId = event.url.searchParams.get('recipientId');
	const subject = event.url.searchParams.get('subject') || '';

	if (!recipientId) {
		throw error(400, 'Missing recipient');
	}

	try {
		const result = await getMessageRecipientsQuery.fetch({
			event,
			variables: { conferenceId },
			blocking: true
		});

		const recipients = result.data?.getMessageRecipients ?? [];
		const recipient = recipients.find((r) => r.id === recipientId);

		if (!recipient) {
			throw error(404, 'Recipient not found or not eligible');
		}

		return {
			recipient,
			prefilledSubject: subject
		};
	} catch (loadError) {
		console.error('Messaging recipients load error:', loadError);
		// If we can't load recipients, we can't verify the recipient.
		if (
			loadError instanceof Error &&
			(loadError.message.includes('404') || loadError.message.includes('Missing recipient'))
		) {
			throw loadError;
		}
		throw error(500, 'Unable to load recipient details');
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

		const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
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
