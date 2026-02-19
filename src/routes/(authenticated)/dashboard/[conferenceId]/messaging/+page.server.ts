import { fail } from '@sveltejs/kit';
import { graphql } from '$houdini';
import { fastUserQuery } from '$lib/queries/fastUserQuery';
import type { Actions } from './$types';

const messagingPreferenceMutation = graphql(`
	mutation UpdateUserMessagingPreference(
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

export const actions = {
	toggleMessaging: async (event) => {
		const formData = await event.request.formData();
		const enabledValue = formData.get('enabled');

		if (typeof enabledValue !== 'string') {
			return fail(400);
		}

		const enabled = enabledValue === 'true';

		const { data } = await fastUserQuery.fetch({ event, blocking: true });
		const userId = data?.offlineUserRefresh.user?.sub;
		if (!userId) {
			return fail(401);
		}

		await messagingPreferenceMutation.mutate(
			{
				where: { id: userId },
				canReceiveDelegationMail: enabled
			},
			{ event }
		);

		return { success: true };
	}
} satisfies Actions;
