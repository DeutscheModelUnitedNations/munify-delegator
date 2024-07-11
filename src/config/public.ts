import { Type } from "@sinclair/typebox";
import { env } from "$env/dynamic/public";
import { Value } from "@sinclair/typebox/value";

const separator = "_";
const prefix = "PUBLIC_";

const raw = Object.entries(env).reduce(
	(acc, [key, value]) => {
		if (key.startsWith(prefix)) {
			acc[key.replace(prefix, "").split(separator).join(".")] = value;
		}
		return acc;
	},
	// biome-ignore lint/suspicious/noExplicitAny: we check type manually later
	{} as any,
);

const schema = Type.Object({
	OIDC: Type.Object({
		AUTHORITY: Type.String(),
		CLIENT_ID: Type.String(),
		HOSTNAME: Type.String(),
	}),
});

const schemaErrors = [...Value.Errors(schema, raw)];
if (schemaErrors.length > 0) {
	throw new Error(
		`Error(s) in validating env config schema: ${schemaErrors.join(", ")}`,
	);
}
export const publicConfig = Value.Decode(schema, raw);
