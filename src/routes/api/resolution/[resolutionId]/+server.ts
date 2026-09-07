import { context } from '$api/context/context';
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

	const match = /^data:(?<mime>[^;,]+)?(?<base64>;base64)?,(?<data>.*)$/s.exec(resolution.content);
	if (!match?.groups) {
		throw error(500, 'Stored resolution has an invalid format');
	}

	const mime = match.groups.mime || 'application/pdf';
	const isBase64 = !!match.groups.base64;
	const raw = match.groups.data ?? '';
	const bytes = isBase64
		? Buffer.from(raw, 'base64')
		: Buffer.from(decodeURIComponent(raw), 'utf-8');

	// Sanitize the filename for the Content-Disposition header (strip quotes/newlines).
	const safeName = (resolution.fileName || 'resolution.pdf').replace(/["\r\n]/g, '');

	return new Response(bytes, {
		headers: {
			'Content-Type': mime,
			'Content-Length': String(bytes.byteLength),
			'Content-Disposition': `attachment; filename="${safeName}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
