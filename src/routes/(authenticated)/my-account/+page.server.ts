import type { PageServerLoad } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { userFormSchema } from './form-schema';
import { error, redirect, type Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { nullFieldsToUndefined } from '$lib/helpers/nullFieldsToUndefined';
import { client } from '$lib/api/rumbleClient/client';
import { configPublic } from '$config/public';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const fullUser = await client.query.user({
		__args: { id: user.sub },
		givenName: true,
		familyName: true,
		birthday: true,
		phone: true,
		street: true,
		apartment: true,
		zip: true,
		city: true,
		country: true,
		gender: true,
		pronouns: true,
		foodPreference: true,
		emergencyContacts: true,
		wantsToReceiveGeneralInformation: true,
		wantsJoinTeamInformation: true
	});

	if (!fullUser) {
		throw error(404, m.userNotFound());
	}

	const { givenName, familyName, ...rest } = fullUser;
	// The form keeps the OIDC claim names for these two; everything else matches the column names.
	const form = await superValidate(
		nullFieldsToUndefined({ ...rest, given_name: givenName, family_name: familyName }),
		zod4(userFormSchema)
	);

	const eventUrl = event.url;

	let redirectUrl = eventUrl.searchParams.get('redirect') || undefined;

	if (redirectUrl && new URL(redirectUrl).host !== eventUrl.host) {
		redirectUrl = undefined;
	}

	// Logto Account Center deep-link support
	const accountCenterUrl =
		configPublic.PUBLIC_OIDC_ACCOUNT_URL ??
		configPublic.PUBLIC_OIDC_AUTHORITY.replace(/\/oidc\/?$/, '') + '/account';
	const accountRedirectUrl = `${eventUrl.origin}/my-account`;
	const accountUpdateSuccess = eventUrl.searchParams.get('show_success') || undefined;

	return {
		form,
		redirectUrl,
		user,
		accountCenterUrl,
		accountRedirectUrl,
		accountUpdateSuccess
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(userFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// since we are in a form action we need to re-fetch who we are
		const { user } = await client.query.offlineUserRefresh({ user: { sub: true } });
		const userId = user?.sub;
		if (!userId) {
			return message(form, m.userNotFound());
		}

		const { given_name, family_name, ...formData } = form.data;
		await client.mutate.updateUser({
			__args: { ...formData, id: userId, givenName: given_name, familyName: family_name },
			id: true
		});

		const redirectUrl = event.url.searchParams.get('redirect');
		if (redirectUrl) {
			return redirect(302, redirectUrl);
		}

		// Display a success status message
		return message(form, m.saved());
	}
} satisfies Actions;
