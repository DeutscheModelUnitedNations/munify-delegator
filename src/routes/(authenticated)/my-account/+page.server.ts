import type { PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { userFormSchema } from './form-schema';
import { graphql, redirect } from '$houdini';
import { error, type Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { nullFieldsToUndefined } from '$lib/services/nullFieldsToUndefined';
import { fastUserQuery } from '$lib/queries/fastUserQuery';

const userQuery = graphql(`
	query FullUserMyAccountQuery($id: String!) {
		findUniqueUser(where: { id: $id }) {
			birthday
			phone
			street
			apartment
			zip
			city
			country
			gender
			pronouns
			foodPreference
			wantsToReceiveGeneralInformation
			wantsJoinTeamInformation
		}
	}
`);

const userMutation = graphql(`
	mutation UpdateUser($data: UserUpdateDataInput!, $where: UserWhereUniqueInput!) {
		updateOneUser(where: $where, data: $data) {
			id
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const { data } = await userQuery.fetch({ event, variables: { id: user.sub }, blocking: true });
	const fullUser = data?.findUniqueUser;

	if (!fullUser) {
		throw error(404, m.userNotFound());
	}

	const form = await superValidate(nullFieldsToUndefined(fullUser), zod(userFormSchema));

	const eventUrl = event.url;

	let redirectUrl = eventUrl.searchParams.get('redirect') || undefined;

	if (redirectUrl && new URL(redirectUrl).host !== eventUrl.host) {
		redirectUrl = undefined;
	}

	return {
		form,
		redirectUrl,
		user
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod(userFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// since we are in a form action we need to re-fetch who we are
		const { data } = await fastUserQuery.fetch({ event, blocking: true });
		const userId = data?.offlineUserRefresh.user?.sub;
		if (!userId) {
			return message(form, m.userNotFound());
		}

		await userMutation.mutate(
			{
				data: {
					...form.data
				},
				where: {
					id: userId
				}
			},
			{ event }
		);

		const redirectUrl = event.url.searchParams.get('redirect');
		if (redirectUrl) {
			return redirect(302, redirectUrl);
		}

		// Display a success status message
		return message(form, m.saved());
	}
} satisfies Actions;
