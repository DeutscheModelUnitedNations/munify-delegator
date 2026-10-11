import type { RequestEvent } from '@sveltejs/kit';
import { execute, parse, type DocumentNode } from 'graphql';
import { yoga } from '$api/yoga';
import { fileFromRow, fileQuery, isValidFileId, type FileKind, type StoredFile } from './files';

/** Runs `document` in-process with the request's own context, so the abilities apply. */
async function executeAsCaller(event: RequestEvent, document: DocumentNode, id: string) {
	const envelop = yoga.getEnveloped(event);
	return execute({
		schema: envelop.schema,
		document,
		variableValues: { id },
		contextValue: await envelop.contextFactory?.()
	});
}

/**
 * Reads one stored file as the caller of `event`.
 *
 * It runs a GraphQL query in-process, with the request's own context, instead of reading the
 * table. That way the abilities decide, including the per-row column masks: a caller who may not
 * see a template gets the same answer here as from the API.
 */
export async function readStoredFile(
	event: RequestEvent,
	kind: FileKind,
	id: string,
	column: string
): Promise<StoredFile> {
	if (!isValidFileId(id)) return { status: 'missing' };
	const result = await executeAsCaller(event, parse(fileQuery(kind, column)), id);
	if (result.errors) return { status: 'forbidden' };
	return fileFromRow(result.data?.[kind], column);
}
