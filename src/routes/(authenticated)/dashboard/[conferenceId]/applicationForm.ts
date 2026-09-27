import { defaults } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';

/**
 * The school/experience/motivation form, seeded from whichever registration the person holds.
 *
 * `defaults` rather than `superValidate`: the form is submitted through a GraphQL mutation in
 * SPA mode, so there is no action to validate against on the server.
 */
export function makeApplicationForm(participation: MyConferenceParticipation | undefined) {
	const delegation = participation?.delegationMember?.delegation;
	const singleParticipant = participation?.singleParticipant;

	return defaults(
		{
			school: delegation?.school || singleParticipant?.school || '',
			experience: delegation?.experience || singleParticipant?.experience || '',
			motivation: delegation?.motivation || singleParticipant?.motivation || ''
		},
		zod4(applicationFormSchema)
	);
}

export type ApplicationForm = ReturnType<typeof makeApplicationForm>;
