// file initialized by the Paraglide-SvelteKit CLI - Feel free to edit it
import { sequence } from '@sveltejs/kit/hooks';
import { i18n } from '$lib/i18n';
import type { HandleServerError } from '@sveltejs/kit';

// add your own hooks as part of the sequence here
export const handle = sequence(i18n.handle(), async ({ event, resolve }) => {
	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name.startsWith('x-') || name.toLowerCase() === 'content-type'
	});

	return response;
});