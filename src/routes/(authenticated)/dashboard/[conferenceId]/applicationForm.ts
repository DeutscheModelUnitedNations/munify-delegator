import { defaults } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import type * as schema from '$api/db/schema';
import type { z } from 'zod';

/** The answers the questionnaire submits. */
export type ApplicationAnswers = z.infer<typeof applicationFormSchema>;

/**
 * The school/experience/motivation form, seeded from a delegation or a single participant, the
 * two registrations that carry these answers.
 *
 * `defaults` rather than `superValidate`: the form is submitted through a GraphQL mutation in
 * SPA mode, so there is no action to validate against on the server.
 */
export function makeApplicationForm(
	application: Pick<typeof schema.delegation.$inferSelect, 'school' | 'experience' | 'motivation'>
) {
	return defaults(
		{
			school: application.school || '',
			experience: application.experience || '',
			motivation: application.motivation || ''
		},
		zod4(applicationFormSchema)
	);
}
