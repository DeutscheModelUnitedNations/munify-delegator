// @vitest-environment node
/**
 * `t.arg.string().validate(schema)` hands the schema an argument that was left out as well, so one that
 * refuses that makes an optional argument a required one, for every caller. Checked on the schema as it
 * is served.
 */
import { expect, test, vi } from 'vitest';

// Nothing is connected to while the schema is built: every variable counts as unset.
const unset = vi.hoisted(
	() => () => new Proxy({}, { has: (_, key) => key !== 'then', get: () => undefined })
);
vi.mock('$app/env/private', unset);
vi.mock('$app/env/public', unset);
// in development registering the handlers writes the generated client
vi.mock('$app/env', () => ({ dev: false, building: false, browser: false, version: '' }));
vi.mock('#api/db/db', async () => {
	const { drizzle } = await import('drizzle-orm/node-postgres');
	const { relations } = await import('#api/db/relations');
	return { db: drizzle.mock({ relations }), schema: await import('#api/db/schema/index') };
});
vi.mock('#api/services/oidc/OIDC', () => ({ OIDC: {} }));
// makes a key pair of the certificate secret, which takes seconds
vi.mock('#api/handlers/certificate/certificateService', () => ({}));

const { buildSchema } = await import('#api/rumble');
await import('#api/handlers/register');
const schema = buildSchema();

type Field = ReturnType<NonNullable<ReturnType<typeof schema.getQueryType>>['getFields']>[string];
type Argument = Field['args'][number];

interface Validator {
	'~standard': { validate: (value: unknown) => unknown };
}

/** The schemas an argument is validated by, where the validation plugin keeps them. */
function validatorsOf({ extensions }: Argument): Validator[] {
	const kept: unknown = extensions['@pothos/plugin-validation'];
	if (typeof kept !== 'object' || kept === null || !('schemas' in kept)) return [];
	return Array.isArray(kept.schemas) ? kept.schemas : [];
}

const isOptional = ({ type, defaultValue }: Argument) =>
	!String(type).endsWith('!') && defaultValue === undefined;

async function refuses({ validator, value }: { validator: Validator; value: unknown }) {
	const result = await validator['~standard'].validate(value);
	return typeof result === 'object' && result !== null && 'issues' in result && !!result.issues;
}

const validated = [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()]
	.flatMap((type) => Object.values(type?.getFields() ?? {}))
	.flatMap((field) => field.args.map((arg) => ({ field, arg })))
	.filter(({ arg }) => isOptional(arg) && validatorsOf(arg).length > 0)
	.map(({ field, arg }): [string, Argument] => [`${field.name}(${arg.name})`, arg]);

test('optional arguments are validated at all', () => {
	expect(validated.map(([name]) => name)).toContain('createAttendanceEntry(accessCardId)');
});

test.each(validated)('%s can be left out', async (_, arg) => {
	for (const validator of validatorsOf(arg)) {
		expect(await refuses({ validator, value: undefined })).toBe(false);
	}
});
