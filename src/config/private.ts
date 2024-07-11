import { Type } from "@sinclair/typebox";
import { env } from "$env/dynamic/private";
import { Value } from "@sinclair/typebox/value";

const separator = "_";

const raw = Object.entries(env).reduce(
	(acc, [key, value]) => {
		acc[key.split(separator).join(".")] = value;
		return acc;
	},
	// biome-ignore lint/suspicious/noExplicitAny: we check type manually later
	{} as any,
);

const schema = Type.Object({
	PORT: Type.Number(),
	HOST: Type.String(),
	DATABASE_URL: Type.String(),
});

const schemaErrors = [...Value.Errors(schema, raw)];
if (schemaErrors.length > 0) {
	throw new Error(
		`Error(s) in validating env config schema: ${schemaErrors.join(", ")}`,
	);
}
export const publicConfig = Value.Decode(schema, raw);
