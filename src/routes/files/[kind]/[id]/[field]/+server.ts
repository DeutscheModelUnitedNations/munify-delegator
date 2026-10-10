import { createHash } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { FAILURE_STATUS, fileHeaders, findFileSource } from '$api/services/files';
import { readStoredFile } from '$api/services/fileReader';
import type { RequestHandler } from './$types';

/**
 * Serves a stored file as real bytes, so the browser can cache it and `<img src>` / `<a href>`
 * work without the file travelling through GraphQL. See `$api/services/files` for what is served
 * and how the caller's rights are applied.
 */
export const GET: RequestHandler = async (event) => {
	const { kind, id, field } = event.params;
	const source = findFileSource(kind, field);
	if (!source) throw error(404, 'Not found');

	const file = await readStoredFile(event, source.kind, id, source.column);
	if (file.status !== 'found') throw error(FAILURE_STATUS[file.status], 'Not available');

	const etag = `"${createHash('sha256').update(file.bytes).digest('base64url')}"`;
	const headers = fileHeaders(file, source.cacheable, etag);

	if (event.request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers });
	}
	return new Response(file.bytes, { headers });
};
