import { graphql } from '$houdini';
import { nullFieldsToUndefined } from '$lib/services/nullFieldsToUndefined';
import { fail, message, superValidate } from 'sveltekit-superforms';
import type { Actions, PageServerLoad } from './$types';
import { zod4 } from 'sveltekit-superforms/adapters';
import { waitingListFormSchema } from './form-schema';
import { m } from '$lib/paraglide/messages';

const waitingListEntryQuery = graphql(`
	query WaitingListEntryParticipantQuery($conferenceId: String!, $userId: String!) {
		findUniqueWaitingListEntry(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			school
			motivation
			experience
			requests
			createdAt
		}
	}
`);

const addWaitingListEntryMutation = graphql(`
	mutation AddWaitingListEntryMutation(
		$conferenceId: ID!
		$motivation: String!
		$school: String!
		$experience: String!
		$requests: String
	) {
		createOneWaitingListEntry(
			conferenceId: $conferenceId
			motivation: $motivation
			school: $school
			experience: $experience
			requests: $requests
		) {
			id
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();

	const { data } = await waitingListEntryQuery.fetch({
		event,
		variables: { conferenceId: event.params.conferenceId, userId: user.sub },
		blocking: true
	});
	const waitingListEntry = data?.findUniqueWaitingListEntry;

	const form = await superValidate(
		nullFieldsToUndefined(waitingListEntry) as any,
		zod4(waitingListFormSchema)
	);

	return {
		form,
		alreadyOnWaitingList: !!waitingListEntry
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(waitingListFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}
		await addWaitingListEntryMutation.mutate(
			{
				...form.data,
				conferenceId: event.params.conferenceId
			},
			{ event }
		);

		return message(form, m.saved());
	}
} satisfies Actions;
