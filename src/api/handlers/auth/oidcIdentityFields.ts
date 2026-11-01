import type { schemaBuilder } from '#api/rumble';

type SimpleObjectFieldBuilder = PothosSchemaTypes.RootFieldBuilder<
	(typeof schemaBuilder)['$inferSchemaTypes'],
	unknown,
	'SimpleObject'
>;

/** The identity an OIDC session carries, as every object describing a signed-in person has it. */
export const oidcIdentityFields = (t: SimpleObjectFieldBuilder) => ({
	sub: t.string(),
	email: t.string(),
	preferred_username: t.string({ nullable: true }),
	family_name: t.string({ nullable: true }),
	given_name: t.string({ nullable: true })
});
