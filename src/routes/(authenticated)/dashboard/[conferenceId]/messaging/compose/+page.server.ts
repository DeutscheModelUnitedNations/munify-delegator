import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { graphql } from '$houdini';
import { fastUserQuery } from '$lib/queries/fastUserQuery';

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

const messagingPreferenceMutation = graphql(`
	mutation ComposeToggleMessagingPreference(
		$where: UserWhereUniqueInput!
		$canReceiveDelegationMail: Boolean!
	) {
		updateUserMessagingPreference(
			where: $where
			canReceiveDelegationMail: $canReceiveDelegationMail
		) {
			id
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

const sendDelegationMessageMutation = graphql(`
	mutation SendDelegationMessageMutation(
		$conferenceId: String!
		$recipientId: String!
		$subject: String!
		$body: String!
		$origin: String!
		$replyToMessageId: String
	) {
		sendDelegationMessage(
			conferenceId: $conferenceId
			recipientId: $recipientId
			subject: $subject
			body: $body
			origin: $origin
			replyToMessageId: $replyToMessageId
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

export const actions = {
	toggleMessaging: async (event) => {
		const formData = await event.request.formData();
		const enabledValue = formData.get('enabled');

		if (typeof enabledValue !== 'string') {
			return fail(400, { error: 'Invalid request' });
		}

		const enabled = enabledValue === 'true';

		const { data } = await fastUserQuery.fetch({ event, blocking: true });
		const userId = data?.offlineUserRefresh.user?.sub;
		if (!userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		await messagingPreferenceMutation.mutate(
			{
				where: { id: userId },
				canReceiveDelegationMail: enabled
			},
			{ event }
		);

		return { status: 'ok' };
	},
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

		const replyToMessageIdValue = formData.get('replyToMessageId');
		const replyToMessageId =
			typeof replyToMessageIdValue === 'string' && replyToMessageIdValue.trim()
				? replyToMessageIdValue.trim()
				: null;

		try {
			await sendDelegationMessageMutation.mutate(
				{
					conferenceId,
					recipientId,
					subject,
					body: messageBody,
					origin: event.url.origin,
					replyToMessageId
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
