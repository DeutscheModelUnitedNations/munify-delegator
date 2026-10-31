import { z } from 'zod';

/**
 * A JSON argument holding a whole document, sent as a JSON string or already parsed. A document
 * that does not fit `schema` is refused with one issue, `invalid` worded around zod's details.
 */
export function jsonDocument<S extends z.ZodType>({
	schema,
	malformed,
	invalid
}: {
	schema: S;
	malformed: () => string;
	invalid: (details: string) => string;
}) {
	return z.unknown().transform((value, ctx): z.output<S> => {
		let raw = value;
		if (typeof value === 'string') {
			try {
				raw = JSON.parse(value);
			} catch {
				ctx.issues.push({ code: 'custom', input: value, message: malformed() });
				return z.NEVER;
			}
		}
		const parsed = schema.safeParse(raw);
		if (parsed.success) return parsed.data;
		ctx.issues.push({
			code: 'custom',
			input: value,
			message: invalid(z.prettifyError(parsed.error))
		});
		return z.NEVER;
	});
}
