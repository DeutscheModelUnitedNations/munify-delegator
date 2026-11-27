import { resolutionToTypst } from '@deutschemodelunitednations/munify-resolution-editor/res-markup';
import type {
	Resolution,
	ResolutionHeaderData
} from '@deutschemodelunitednations/munify-resolution-editor/schema';
import {
	paperToTypst,
	type PaperTypstBranding,
	type PaperTypstMeta
} from '#lib/helpers/paperTypst';

/** Build a filesystem-safe base filename from a resolution document number. */
function safeBaseName(documentNumber: string | null | undefined): string {
	const base = (documentNumber ?? 'resolution').replace(/[^a-zA-Z0-9._-]+/g, '_');
	return base || 'resolution';
}

function triggerDownload({ blob, filename }: { blob: Blob; filename: string }) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/** Serialize the resolution to a Typst source file and download it (client-side). */
export function downloadResolutionTypst({
	resolution,
	header,
	documentNumber
}: {
	resolution: Resolution;
	header: ResolutionHeaderData;
	documentNumber?: string | null;
}) {
	const typst = resolutionToTypst(resolution, header);
	triggerDownload({
		blob: new Blob([typst], { type: 'text/plain;charset=utf-8' }),
		filename: `${safeBaseName(documentNumber)}.typ`
	});
}

/**
 * Request a server-compiled PDF for the resolution and download it.
 * Throws on a non-OK response so callers can surface an error toast.
 */
export async function downloadResolutionPdf({
	resolution,
	header,
	documentNumber
}: {
	resolution: Resolution;
	header: ResolutionHeaderData;
	documentNumber?: string | null;
}) {
	const res = await fetch('/api/pdf', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ resolution, header })
	});
	if (!res.ok) {
		throw new Error(`PDF request failed (${res.status})`);
	}
	triggerDownload({ blob: await res.blob(), filename: `${safeBaseName(documentNumber)}.pdf` });
}

/**
 * Serialize a position/introduction paper to a Typst source file and download
 * it (client-side).
 */
export function downloadPaperTypst({
	content,
	meta,
	branding,
	documentNumber
}: {
	content: Parameters<typeof paperToTypst>[0]['content'];
	meta: PaperTypstMeta;
	branding: PaperTypstBranding;
	documentNumber?: string | null;
}) {
	const typst = paperToTypst({ content, meta, branding });
	triggerDownload({
		blob: new Blob([typst], { type: 'text/plain;charset=utf-8' }),
		filename: `${safeBaseName(documentNumber)}.typ`
	});
}

/**
 * Request a server-set PDF of a position/introduction paper (in its conference's branding, with
 * its logo) and download it. Throws on a non-OK response so callers can surface an error toast.
 */
export async function downloadPaperPdf({
	conferenceId,
	content,
	meta,
	documentNumber
}: {
	conferenceId: string;
	content: Parameters<typeof paperToTypst>[0]['content'];
	meta: PaperTypstMeta;
	documentNumber?: string | null;
}) {
	const res = await fetch('/api/pdf', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ paper: { conferenceId, content: content ?? {}, meta } })
	});
	if (!res.ok) {
		throw new Error(`PDF request failed (${res.status})`);
	}
	triggerDownload({ blob: await res.blob(), filename: `${safeBaseName(documentNumber)}.pdf` });
}
