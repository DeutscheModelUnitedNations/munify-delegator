import { GraphQLError, type DocumentNode, type OperationDefinitionNode } from 'graphql';
import type { RequestEvent } from '@sveltejs/kit';
import { yoga } from '#api/yoga';
import { redactResult, type ResultValue } from './redact';
import { dataOfResult, McpRefusal } from './toolResults';

/**
 * Runs GraphQL for an AI assistant, in-process like the SSR remote function
 * (`#api/graphql.remote`): through yoga's envelop, so the context carries the caller's abilities
 * (narrowed to the conference of the tool call by `locals.mcp`) and graphql-armor's limits and
 * the database rule errors apply as on `/api/graphql`.
 */

/**
 * Validates a document against the schema, with graphql-armor's limits; the problems, or none.
 * Armor throws the limit it hit (`propagateOnRejection`) rather than returning it among the
 * validation errors; that is a problem with the query too, and the assistant has to hear it.
 */
export function validationProblems({
	event,
	document
}: {
	event: RequestEvent;
	document: DocumentNode;
}) {
	const envelop = yoga.getEnveloped(event);
	try {
		return envelop.validate(envelop.schema, document).map((error) => error.message);
	} catch (error) {
		if (error instanceof GraphQLError) return [error.message];
		throw error;
	}
}

/** The executable schema, for building and checking documents. */
export function executableSchema(event: RequestEvent) {
	return yoga.getEnveloped(event).schema;
}

/**
 * Executes a validated operation with the caller's abilities and answers its data unredacted, or
 * throws `McpRefusal` with what failed. Only for code that redacts or aggregates before anything
 * reaches the assistant; tools answer through `runRedacted`.
 */
export async function runUnredacted({
	event,
	document,
	variables
}: {
	event: RequestEvent;
	document: DocumentNode;
	variables: Record<string, unknown>;
}): Promise<{ [key: string]: ResultValue }> {
	const envelop = yoga.getEnveloped(event);
	const result = await envelop.execute({
		schema: envelop.schema,
		document,
		variableValues: variables,
		contextValue: await envelop.contextFactory()
	});
	if (Symbol.asyncIterator in result)
		throw new McpRefusal('Incremental delivery is not supported.');
	return dataOfResult(result);
}

/** Executes a validated operation with the caller's abilities and answers its redacted data. */
export async function runRedacted({
	event,
	document,
	operation,
	variables
}: {
	event: RequestEvent;
	document: DocumentNode;
	operation: OperationDefinitionNode;
	variables: Record<string, unknown>;
}) {
	const data = await runUnredacted({ event, document, variables });
	return redactResult({ schema: executableSchema(event), document, operation, data });
}
