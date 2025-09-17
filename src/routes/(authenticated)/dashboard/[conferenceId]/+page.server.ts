import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { zod } from 'sveltekit-superforms/adapters';
import { applicationFormSchema } from '$lib/schemata/applicationForm';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();

	const applicationForm = await superValidate(
		{
			school:
				parent.conferenceQueryData?.findUniqueDelegationMember?.delegation.school ||
				parent.conferenceQueryData?.findUniqueSingleParticipant?.school ||
				'',
			experience:
				parent.conferenceQueryData?.findUniqueDelegationMember?.delegation.experience ||
				parent.conferenceQueryData?.findUniqueSingleParticipant?.experience ||
				'',
			motivation:
				parent.conferenceQueryData?.findUniqueDelegationMember?.delegation.motivation ||
				parent.conferenceQueryData?.findUniqueSingleParticipant?.motivation ||
				''
		},
		zod(applicationFormSchema)
	);

	return {
		...parent,
		applicationForm
	};
};
