import type { PageServerLoad } from './$houdini';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { graphql } from '$houdini';
import { redirect, type Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { applicationFormSchema } from '$lib/schemata/applicationForm';

const createSingleParticipant = graphql(`
	mutation IndividualApplicationFromFormMutation(
		$conferenceId: ID!
		$motivation: String
		$experience: String
		$school: String
		$roleId: ID!
	) {
		createOneSingleParticipant(
			conferenceId: $conferenceId
			experience: $experience
			motivation: $motivation
			school: $school
			roleId: $roleId
		) {
			id
		}
	}
`);

const singleParticipantAndRoleQuery = graphql(`
	query FindExistingSingleParticipantAndRoleQuery(
		$conferenceId: String!
		$userId: String!
		$roleId: String!
	) {
		findUniqueSingleParticipant(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			experience
			motivation
			school
		}

		findUniqueCustomConferenceRole(where: { id: $roleId }) {
			name
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();

	const found = await singleParticipantAndRoleQuery.fetch({
		event,
		variables: {
			roleId: event.params.roleId,
			conferenceId: event.params.conferenceId,
			userId: user.sub
		},
		blocking: true
	});

	const form = await superValidate(
		found.data?.findUniqueSingleParticipant ?? undefined,
		zod(applicationFormSchema)
	);
	return {
		form,
		conferenceId: event.params.conferenceId,
		origin: event.url.origin,
		role: found.data!.findUniqueCustomConferenceRole!
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod(applicationFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await createSingleParticipant.mutate(
			{
				...form.data,
				conferenceId: event.params.conferenceId!,
				roleId: event.params.roleId!
			},
			{ event }
		);
		redirect(302, `/dashboard`);
		return message(form, m.saved());
	}
} satisfies Actions;
