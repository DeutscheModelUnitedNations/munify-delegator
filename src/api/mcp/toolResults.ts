import type { CallToolResult } from '@modelcontextprotocol/server';
import {
	GraphQLError,
	parse,
	validate,
	type DocumentNode,
	type GraphQLSchema,
	type OperationDefinitionNode
} from 'graphql';
import { logger } from '#lib/logger';
import { argumentProblems, singleQueryOperation } from './operationGuard';
import type { ResultValue } from './redact';

/**
 * What a tool call answers: the pure part of the MCP server's plumbing, kept apart from the
 * request so it is tested on its own.
 */

/** Something that keeps an operation from running, or made it fail, worded for the assistant. */
export class McpRefusal extends Error {
	constructor(
		message: string,
		readonly outcome: 'REFUSED' | 'ERROR' = 'REFUSED'
	) {
		super(message);
		this.name = 'McpRefusal';
	}
}

/** At most this many characters of JSON go back; larger answers are refused with advice. */
export const MAX_ANSWER_LENGTH = 200_000;

/** A tool's answer: JSON as text. Refuses one too large for an assistant's context. */
export function answerOf(value: unknown): CallToolResult {
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	if (text.length > MAX_ANSWER_LENGTH) {
		throw new McpRefusal(
			`The answer is too large (${text.length} characters). Ask for fewer fields or rows (limit, offset, where).`
		);
	}
	return { content: [{ type: 'text', text }] };
}

/** A tool's answer that it refused or failed. */
export function refusal(message: string): CallToolResult {
	return { content: [{ type: 'text', text: message }], isError: true };
}

/**
 * How a tool call ended that threw, for the answer and the log. An unexpected error tells the
 * assistant nothing (it can quote a statement's parameters) and is logged instead.
 */
export function failureOf(error: unknown) {
	if (error instanceof McpRefusal) return { outcome: error.outcome, message: error.message };
	logger.error('An MCP tool failed', error);
	return { outcome: 'ERROR' as const, message: 'Unexpected error.' };
}

/** yoga's rule: an error is expected when it was raised as a `GraphQLError` all the way down. */
function isExpected(value: unknown): boolean {
	if (!(value instanceof GraphQLError)) return false;
	return value.originalError == null || isExpected(value.originalError);
}

/** One failed field as the assistant is told: an expected error's message, nothing else. */
function assistantMessage(error: GraphQLError) {
	const message = isExpected(error) ? error.message : 'Unexpected error.';
	return error.path ? `${error.path.join('.')}: ${message}` : message;
}

/** The refusal an operation's errors make: refused when all were expected, an error otherwise. */
export function refusalOfErrors(errors: readonly GraphQLError[]) {
	const unexpected = errors.filter((error) => !isExpected(error));
	for (const error of unexpected) logger.error('An MCP operation failed', error);
	return new McpRefusal(
		errors.map(assistantMessage).join('\n'),
		unexpected.length > 0 ? 'ERROR' : 'REFUSED'
	);
}

function isResultRecord(value: unknown): value is { [key: string]: ResultValue } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An executed operation's data, or the refusal its errors make. */
export function dataOfResult(result: { data?: unknown; errors?: readonly GraphQLError[] }) {
	if (result.errors?.length) throw refusalOfErrors(result.errors);
	return isResultRecord(result.data) ? result.data : {};
}

function parsed(query: string) {
	try {
		return parse(query);
	} catch (error) {
		throw new McpRefusal(error instanceof Error ? error.message : 'The query does not parse.');
	}
}

/**
 * An assistant's query, checked before it runs: it parses, holds one read-only operation, is
 * valid (with `extraRules`, graphql-armor's limits), and asks by nothing personal
 * (`argumentProblems`). Throws `McpRefusal` with what is wrong.
 */
export function checkedQuery({
	schema,
	query,
	variables,
	validateDocument = (document) => validate(schema, document).map((error) => error.message)
}: {
	schema: GraphQLSchema;
	query: string;
	variables: Record<string, unknown>;
	validateDocument?: (document: DocumentNode) => string[];
}): { document: DocumentNode; operation: OperationDefinitionNode } {
	const document = parsed(query);
	const single = singleQueryOperation(document);
	if ('problem' in single) throw new McpRefusal(single.problem);
	const invalid = validateDocument(document);
	if (invalid.length > 0) throw new McpRefusal(invalid.join('\n'));
	const problems = argumentProblems({ schema, document, operation: single.operation, variables });
	if (problems.length > 0) throw new McpRefusal(problems.join('\n'));
	return { document, operation: single.operation };
}
