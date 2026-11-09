import {
	fromJsonSchema,
	McpServer,
	type CallToolResult,
	type ToolAnnotations
} from '@modelcontextprotocol/server';
import { parse, type GraphQLSchema } from 'graphql';
import type { RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { recordMcpCall } from '#api/handlers/mcpAuditEntry/mcpAuditEntryService';
import { logger } from '#lib/logger';
import { REDACTED, SMALL_GROUP } from './classification';
import { executableSchema, runRedacted, runUnredacted, validationProblems } from './execute';
import { answerOf, checkedQuery, failureOf, McpRefusal, refusal } from './toolResults';
import { assertCanUseMcpIn, reachableConferences, type McpPrincipal } from './mcpPermissions';
import {
	mutationInput,
	mutationOperation,
	mutationToolsOf,
	needsConfirmation,
	previewOf,
	toolAnnotations,
	type MutationTool
} from './mutationTools';
import { describeSchema } from './schemaDescription';
import {
	ASSIGNMENT_QUERY,
	assignmentDataSchema,
	assignmentOverview,
	COUNT_DIMENSIONS,
	COUNT_QUERY,
	countDataSchema,
	countGroupingProblem,
	MAX_PARTICIPANT_ROWS,
	PAGE_SIZE,
	participantCounts,
	participantFilterSchema,
	participantOverview,
	participantsDataSchema,
	PARTICIPANTS_QUERY
} from './curatedReads';

/**
 * The MCP server AI assistants talk to (`/mcp`): one instance per request, acting with the
 * caller's own abilities. Every tool but `whoami` names the conference it is about; the call is
 * refused unless the caller may use MCP there (`assertCanUseMcpIn`), and runs with the rules
 * narrowed to that conference (`locals.mcp`). What comes back is redacted (`redact.ts`), and every
 * call is written to the conference's MCP log.
 */

const INSTRUCTIONS = `MUNIFY DELEGATOR manages Model United Nations conferences: registrations, delegations, the assignment of roles and committees, paperwork, the schedule.

You act with the account of the person who connected you, with exactly their rights, and only in conferences whose project management switched on AI assistants.

Start with whoami: it lists the conferences you can work in and the person's team roles there. Every other tool takes the conferenceId it is about.

Personal data never reaches you. Names, contact details, address lines, birthdays, gender, diet and every free text by or about people read "${REDACTED}"; null still means "nothing stored". Counts by redacted attributes read "${SMALL_GROUP}" for groups smaller than five. People are ids: tell the user which ids you mean, and they look the people up in the app. You cannot filter, sort or search by personal data, and tools never take personal data as input. Do not ask the user to paste personal data into the conversation.

For reading, prefer the task tools (participant_overview, participant_counts, assignment_overview). graphql_query runs any read-only query; graphql_schema describes the types and marks what is redacted.

Changes go through the dedicated tools, one per action. Tools whose change reaches people outside the team (participants, the public) answer with a preview first: show it to the user and call again with confirm: true only once they agreed.`;

interface ToolCall {
	event: RequestEvent;
	principal: McpPrincipal;
	clientId: string | undefined;
}

/** Refuses a call about a conference the caller may not use MCP in; undefined when they may. */
async function accessRefusal({
	principal,
	conferenceId
}: {
	principal: McpPrincipal;
	conferenceId: string;
}) {
	try {
		await assertCanUseMcpIn({ principal, conferenceId });
		return undefined;
	} catch (error) {
		return refusal(error instanceof McpRefusal ? error.message : 'Unexpected error.');
	}
}

/** Runs `fn` with the rules narrowed to the conference (`locals.mcp`), and how it ended. */
async function runInConference({
	call,
	conferenceId,
	fn
}: {
	call: ToolCall;
	conferenceId: string;
	fn: () => Promise<unknown>;
}) {
	call.event.locals.mcp = { ...call.principal, conferenceId };
	try {
		return { result: answerOf(await fn()), outcome: 'OK' as const, message: undefined };
	} catch (error) {
		const failure = failureOf(error);
		return { result: refusal(failure.message), ...failure };
	} finally {
		call.event.locals.mcp = undefined;
	}
}

/**
 * Runs one tool call about a conference: checks the caller may use MCP there, narrows the rules
 * to it, runs `fn`, and logs the call with how it ended. A call about a conference the caller may
 * not use is not logged: the log is that conference's team's.
 */
async function aboutConference({
	call,
	tool,
	args,
	conferenceId,
	fn
}: {
	call: ToolCall;
	tool: string;
	args: Record<string, unknown>;
	conferenceId: string;
	fn: () => Promise<unknown>;
}): Promise<CallToolResult> {
	const denied = await accessRefusal({ principal: call.principal, conferenceId });
	if (denied) return denied;
	const started = Date.now();
	const { result, outcome, message } = await runInConference({ call, conferenceId, fn });
	await recordMcpCall({
		conferenceId,
		userId: call.principal.userId,
		clientId: call.clientId,
		tool,
		arguments: args,
		outcome,
		message,
		durationMs: Date.now() - started
	}).catch((error) => logger.error('Writing the MCP log failed', error));
	return result;
}

const conferenceIdSchema = z.string().min(1).describe('The conference (see whoami).');

const READ_ONLY: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };

function registerReadTools({ server, call }: { server: McpServer; call: ToolCall }) {
	server.registerTool(
		'whoami',
		{
			description:
				'Who you act as and the conferences you can work in, with the team roles held there. Call this first.',
			annotations: READ_ONLY
		},
		async () => {
			const conferences = await reachableConferences(call.principal);
			return answerOf({
				userId: call.principal.userId,
				systemAdmin: call.principal.isAdmin,
				conferences,
				note:
					conferences.length === 0
						? 'No conference is available: AI assistants are switched on per conference by its project management, and only for its team.'
						: undefined
			});
		}
	);

	server.registerTool(
		'graphql_schema',
		{
			description:
				'Describes the GraphQL API for graphql_query. Without a type: the root queries and their arguments. With a type name: its fields, each marked when it reads [redacted] or is a count shown as <5 for small groups, or the fields of an input type.',
			inputSchema: z.object({
				type: z.string().optional().describe('A type name such as Delegation, or none.')
			}),
			annotations: READ_ONLY
		},
		async ({ type }) =>
			answerOf(describeSchema({ schema: executableSchema(call.event), typeName: type }))
	);

	server.registerTool(
		'graphql_query',
		{
			description:
				'Runs one read-only GraphQL query with your rights, for anything the task tools do not cover. Personal data in the answer reads [redacted]. Lists take where, orderBy (asc/desc), limit and offset, but not on personal fields; see graphql_schema. Example: { delegations(where: { conferenceId: { eq: "…" }, applied: { eq: true } }, limit: 50) { id memberCount assignedRoleId } }',
			inputSchema: z.object({
				conferenceId: conferenceIdSchema,
				query: z.string().min(1).describe('A GraphQL document with exactly one query operation.'),
				variables: z.record(z.string(), z.unknown()).optional()
			}),
			annotations: READ_ONLY
		},
		async ({ conferenceId, query, variables }) =>
			aboutConference({
				call,
				tool: 'graphql_query',
				args: { query, variables },
				conferenceId,
				fn: () => runQuery({ event: call.event, query, variables: variables ?? {} })
			})
	);

	server.registerTool(
		'participant_overview',
		{
			description:
				"The conference's participants with their paperwork (payment, terms, guardian and media consent, attendance, check-in issues), kind of participation, delegation, committee, school, city and country, plus a summary over all of them. Filter and page with the arguments. Needs participant care or project management.",
			inputSchema: z.object({
				conferenceId: conferenceIdSchema,
				filter: participantFilterSchema.optional(),
				offset: z.number().int().min(0).default(0),
				limit: z.number().int().min(1).max(500).default(100)
			}),
			annotations: READ_ONLY
		},
		async ({ conferenceId, filter, offset, limit }) =>
			aboutConference({
				call,
				tool: 'participant_overview',
				args: { filter, offset, limit },
				conferenceId,
				fn: async () => {
					const { rows, complete } = await allParticipantRows({
						conferenceId,
						read: async (variables) =>
							participantsDataSchema.parse(
								await runFixedQuery({ event: call.event, source: PARTICIPANTS_QUERY, variables })
							).conferenceParticipants
					});
					const overview = participantOverview({ rows, filter: filter ?? {}, offset, limit });
					return complete ? overview : { ...overview, note: INCOMPLETE };
				}
			})
	);

	server.registerTool(
		'participant_counts',
		{
			description: `Counts the conference's registered participants grouped by up to three of: ${COUNT_DIMENSIONS.join(', ')}. Grouped by gender or foodPreference, groups of fewer than five are left out and summed up as suppressed, and those two can only be counted alone or with each other. Needs participant care or project management.`,
			inputSchema: z.object({
				conferenceId: conferenceIdSchema,
				groupBy: z.array(z.enum(COUNT_DIMENSIONS)).min(1).max(3)
			}),
			annotations: READ_ONLY
		},
		async ({ conferenceId, groupBy }) =>
			aboutConference({
				call,
				tool: 'participant_counts',
				args: { groupBy },
				conferenceId,
				fn: async () => {
					const problem = countGroupingProblem(groupBy);
					if (problem) throw new McpRefusal(problem);
					// Unredacted on purpose: only the counts leave this function, thresholded.
					const document = parse(COUNT_QUERY);
					const { rows, complete } = await allParticipantRows({
						conferenceId,
						read: async (variables) =>
							countDataSchema.parse(await runUnredacted({ event: call.event, document, variables }))
								.conferenceParticipants
					});
					const counts = participantCounts({ rows, groupBy });
					return complete ? counts : { ...counts, note: INCOMPLETE };
				}
			})
	);

	server.registerTool(
		'assignment_overview',
		{
			description:
				'Where the assignment of roles stands: every role with its seats and how many hold it, the size of the draft, what needs attention (required applications without a seat, overfilled roles), and a page of the applied delegations and single participants with their wishes and sighting ratings.',
			inputSchema: z.object({
				conferenceId: conferenceIdSchema,
				offset: z.number().int().min(0).default(0),
				limit: z
					.number()
					.int()
					.min(0)
					.max(500)
					.default(50)
					.describe('How many delegations and single participants to list; 0 for the summary only.')
			}),
			annotations: READ_ONLY
		},
		async ({ conferenceId, offset, limit }) =>
			aboutConference({
				call,
				tool: 'assignment_overview',
				args: { offset, limit },
				conferenceId,
				fn: async () => {
					const data = await runFixedQuery({
						event: call.event,
						source: ASSIGNMENT_QUERY,
						variables: { conferenceId }
					});
					return assignmentOverview({ data: assignmentDataSchema.parse(data), offset, limit });
				}
			})
	);
}

/** Runs an assistant's query: one read-only operation, checked, then executed and redacted. */
function runQuery({
	event,
	query,
	variables
}: {
	event: RequestEvent;
	query: string;
	variables: Record<string, unknown>;
}) {
	const { document, operation } = checkedQuery({
		schema: executableSchema(event),
		query,
		variables,
		validateDocument: (candidate) => validationProblems({ event, document: candidate })
	});
	return runRedacted({ event, document, operation, variables });
}

/** Runs one of the task tools' own queries, checked and redacted like any other. */
function runFixedQuery({
	event,
	source,
	variables
}: {
	event: RequestEvent;
	source: string;
	variables: Record<string, unknown>;
}) {
	const { document, operation } = checkedQuery({
		schema: executableSchema(event),
		query: source,
		variables
	});
	return runRedacted({ event, document, operation, variables });
}

/**
 * Reads every participant row of the conference a page at a time, through `read` (redacted or
 * not), up to `MAX_PARTICIPANT_ROWS`; `complete` says whether that was all of them.
 */
async function allParticipantRows<Row>({
	conferenceId,
	read
}: {
	conferenceId: string;
	read: (variables: Record<string, unknown>) => Promise<Row[]>;
}) {
	const rows: Row[] = [];
	for (let offset = 0; offset < MAX_PARTICIPANT_ROWS; offset += PAGE_SIZE) {
		const page = await read({ conferenceId, limit: PAGE_SIZE, offset });
		rows.push(...page);
		if (page.length < PAGE_SIZE) return { rows, complete: true };
	}
	return { rows, complete: false };
}

/** Said along an answer computed over the first `MAX_PARTICIPANT_ROWS` participants only. */
const INCOMPLETE = `Only the first ${MAX_PARTICIPANT_ROWS} participants were read; counts cover those.`;

/** Runs a call of a mutation tool: a preview while it needs confirming, else the mutation. */
function callMutationTool({
	call,
	tool,
	input
}: {
	call: ToolCall;
	tool: MutationTool;
	input: unknown;
}) {
	const { conferenceId, args, confirmed } = mutationInput(input);
	return aboutConference({
		call,
		tool: tool.name,
		args,
		conferenceId,
		fn: async () => {
			if (needsConfirmation({ tool, args }) && !confirmed) return previewOf({ tool, args });
			const { document, operation, variables } = mutationOperation({ tool, args, conferenceId });
			return runRedacted({ event: call.event, document, operation, variables });
		}
	});
}

function registerMutationTools({
	server,
	call,
	schema
}: {
	server: McpServer;
	call: ToolCall;
	schema: GraphQLSchema;
}) {
	const { tools, problems } = mutationToolsOf(schema);
	for (const problem of problems) logger.error('An MCP tool cannot be offered', { problem });
	for (const tool of tools) {
		server.registerTool(
			tool.name,
			{
				description: tool.description,
				inputSchema: fromJsonSchema(tool.inputSchema),
				annotations: toolAnnotations(tool)
			},
			(input) => callMutationTool({ call, tool, input })
		);
	}
}

/** A fresh MCP server for one request of `principal`. */
export function createMcpServer({
	event,
	principal,
	clientId
}: {
	event: RequestEvent;
	principal: McpPrincipal;
	clientId: string | undefined;
}) {
	const server = new McpServer(
		{ name: 'munify-delegator', version: '1.0.0' },
		{ instructions: INSTRUCTIONS }
	);
	const call: ToolCall = { event, principal, clientId };
	registerReadTools({ server, call });
	registerMutationTools({ server, call, schema: executableSchema(event) });
	return server;
}
