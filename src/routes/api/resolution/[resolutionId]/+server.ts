import { context } from '$api/context/context';
import { fromDataURL } from '$api/services/fileToDataURL';
import { db } from '$db/db';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Streams a stored resolution document for download. The file is persisted as a
 * base64 data URL in the database (same convention as the conference certificate
 * and legal document templates), so we decode it here and hand it back with a
 * sensible filename. Access is gated by the same CASL `read` ability used by the
 * GraphQL layer.
 */
export const GET: RequestHandler = async (event) => {
	const ctx = await context(event);

	const resolution = await db.resolution.findFirst({
		where: {
			id: event.params.resolutionId,
			AND: [ctx.permissions.allowDatabaseAccessTo('read').Resolution]
		},
		select: { content: true, fileName: true }
	});

	if (!resolution) {
		throw error(404, 'Resolution not found');
	}

	const file = fromDataURL(resolution.content);
	if (!file) {
		throw error(500, 'Stored resolution has an invalid format');
	}

	// Sanitize the filename for the Content-Disposition header (strip quotes/newlines).
	const safeName = (resolution.fileName || 'resolution.pdf').replace(/["\r\n]/g, '');

	return new Response(file.bytes, {
		headers: {
			'Content-Type': file.mime,
			'Content-Length': String(file.bytes.byteLength),
			'Content-Disposition': `attachment; filename="${safeName}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
