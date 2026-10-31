import type { schemaBuilder } from '#api/rumble';
import type { SchoolChoice } from '#api/handlers/school/schoolService';
import { applicationFormSchema } from '#lib/schemata/applicationForm';

/**
 * What an application for a delegation or a single seat states besides the conference and role:
 * the applicant's school and the application texts. Shared by `createDelegation` and
 * `createSingleParticipant`.
 */
export type ApplicationArgs = SchoolChoice & {
	conferenceId: string;
	motivation?: string | null;
	experience?: string | null;
};

type ArgBuilder = Pick<
	PothosSchemaTypes.InputFieldBuilder<(typeof schemaBuilder)['$inferSchemaTypes'], 'Arg'>,
	'id' | 'string'
>;

/** The GraphQL arguments of `ApplicationArgs` but the conference, validated like the form. */
export const applicationArgs = (arg: ArgBuilder) => ({
	schoolId: arg.id({
		description: "An existing school as the applicant's own; leave out to name one by `schoolName`."
	}),
	schoolName: arg
		.string({
			description:
				'The name of a school to find (ignoring case and spacing) or create. Neither school argument means no school.'
		})
		.validate(applicationFormSchema.shape.schoolName),
	motivation: arg.string().validate(applicationFormSchema.shape.motivation),
	experience: arg.string().validate(applicationFormSchema.shape.experience)
});
