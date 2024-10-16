import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { typebox } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { message } from 'sveltekit-superforms';
import { Value } from '@sinclair/typebox/value';
import * as m from '$lib/paraglide/messages';
import { conferenceConfigFormSchema } from './schema';

export const load: PageServerLoad = loadApiHandler(async ({ api, params }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');
	const conference = await checkForError(api.conference({ id: params.conferenceId }).get());
	Value.Clean(conferenceConfigFormSchema, conference);
	const form = await superValidate(conference, typebox(conferenceConfigFormSchema), {
		strict: true
	});

	return {
		form
	};
});

export const actions = {
	default: loadApiHandler(async ({ api, params, request }) => {
		const form = await superValidate(request, typebox(conferenceConfigFormSchema), {
			strict: true
		});

		if (!form.valid) {
			return fail(400, { form });
		}

		await checkForError(api.conference({ id: params.conferenceId }).patch(form.data));
		return message(form, m.changesSuccessful());
	})
} satisfies Actions;
