import type { schemaBuilder } from '#api/rumble';
import { applicationFormSchema } from '#lib/schemata/applicationForm';

type ArgBuilder = Pick<
	PothosSchemaTypes.InputFieldBuilder<(typeof schemaBuilder)['$inferSchemaTypes'], 'Arg'>,
	'id' | 'string'
>;

/**
 * What an application for a delegation or a single seat states besides the conference and role:
 * an existing school, or `schoolName` to find or create one (neither for no school), and the
 * application texts.
 */
export const applicationArgs = (arg: ArgBuilder) => ({
	schoolId: arg.id(),
	schoolName: arg.string().validate(applicationFormSchema.shape.schoolName),
	motivation: arg.string().validate(applicationFormSchema.shape.motivation),
	experience: arg.string().validate(applicationFormSchema.shape.experience)
});
