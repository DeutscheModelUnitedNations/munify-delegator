import { defaults } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { applicationFormSchema, applicationTextsSchema } from '#lib/schemata/applicationForm.js';
import type { z } from 'zod';

/** The answers an application starts with: the applicant's own school and the texts. */
export type ApplicationAnswers = z.infer<typeof applicationFormSchema>;

/** The texts the dashboard's questionnaire submits; the school is the person's own, edited apart. */
export type ApplicationTexts = z.infer<typeof applicationTextsSchema>;

/**
 * The experience/motivation form, seeded from a delegation or a single participant, the two
 * registrations that carry these answers.
 *
 * `defaults` rather than `superValidate`: the form is submitted through a GraphQL mutation in
 * SPA mode, so there is no action to validate against on the server.
 */
export function makeApplicationForm(application: {
	experience?: string | null;
	motivation?: string | null;
}) {
	return defaults(
		{
			experience: application.experience || '',
			motivation: application.motivation || ''
		},
		zod4(applicationTextsSchema)
	);
}
