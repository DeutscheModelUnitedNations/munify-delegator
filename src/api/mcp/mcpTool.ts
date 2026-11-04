import { z } from 'zod';

/**
 * Opts a mutation into the MCP server: `extensions: mcpTool({ … })` next to its definition makes
 * it a tool AI assistants can call (`mutationTools.ts` builds it from the field). A mutation
 * without it is not reachable through MCP at all.
 *
 * The tool takes the mutation's arguments, except those that could carry personal data: the
 * person scalars (`PersonName`, `EmailAddress`, `PhoneNumber`, `AddressInput`) never, free text
 * (`String`, `JSON`) only where `textArguments` names it, declaring that it is about things
 * (a committee's name, a calendar entry's room) and never about people. Leaving out a required
 * argument that way is a mistake `mutationTools.test.ts` reports.
 */
const mcpToolSchema = z.object({
	/** Replaces the field's description for the assistant, when that needs other words. */
	description: z.string().optional(),
	/** Free-text arguments that are about things, never about people. */
	textArguments: z.array(z.string()).default([]),
	/**
	 * The call reaches people outside the team (mails, what participants see): the tool only
	 * previews it until it is called again with `confirm: true`, after the user agreed.
	 */
	outward: z.boolean().default(false),
	/** Like `outward`, but only when one of these arguments is given (the conference's stage). */
	outwardArguments: z.array(z.string()).default([])
});

export type McpToolOptions = z.input<typeof mcpToolSchema>;
export type McpToolAnnotation = z.output<typeof mcpToolSchema>;

/** The `extensions` of a mutation field that opts it into the MCP server. */
export function mcpTool(options: McpToolOptions = {}) {
	return { mcp: options };
}

/** The annotation a field's `extensions` carry, or undefined when it did not opt in. */
export function mcpAnnotationOf(extensions: unknown): McpToolAnnotation | undefined {
	const parsed = z.object({ mcp: mcpToolSchema }).safeParse(extensions);
	return parsed.success ? parsed.data.mcp : undefined;
}
