import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { zod4 } from 'sveltekit-superforms/adapters';
import { applicationFormSchema } from '$lib/schemata/applicationForm';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();

	const applicationForm = await superValidate(
		{
			school:
				parent.participation?.delegationMember?.delegation.school ||
				parent.participation?.singleParticipant?.school ||
				'',
			experience:
				parent.participation?.delegationMember?.delegation.experience ||
				parent.participation?.singleParticipant?.experience ||
				'',
			motivation:
				parent.participation?.delegationMember?.delegation.motivation ||
				parent.participation?.singleParticipant?.motivation ||
				''
		},
		zod4(applicationFormSchema)
	);

	return {
		...parent,
		applicationForm
	};
};
