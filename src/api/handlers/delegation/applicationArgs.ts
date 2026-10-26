import type { schemaBuilder } from '#api/rumble.js';

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
	schoolName: arg.string(),
	motivation: arg.string(),
	experience: arg.string()
});
