import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import type { ResolutionHeaderData } from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { error } from '@sveltejs/kit';

// Fast-fail limits — this endpoint shells out to a compiler, so reject
// oversized inputs before any heavy processing.
const MAX_BODY_BYTES = 5_000_000; // 5 MB raw request body
const MAX_TYPST_CHARS = 2_000_000; // ~2 MB of Typst source
const MAX_SVG_BYTES = 2_000_000; // 2 MB decoded emblem SVG

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

const HEADER_STRING_KEYS = [
	'conferenceName',
	'conferenceTitle',
	'committeeAbbreviation',
	'committeeFullName',
	'committeeResolutionHeadline',
	'documentNumber',
	'topic',
	'authoringDelegation',
	'lastEdited',
	'conferenceEmblem'
] as const;

/** Build a typed ResolutionHeaderData from untrusted input without casts. */
export function readHeader(value: unknown): ResolutionHeaderData {
	const header: ResolutionHeaderData = {};
	if (!isRecord(value)) return header;
	for (const key of HEADER_STRING_KEYS) {
		const v = value[key];
		if (typeof v === 'string') header[key] = v;
	}
	const sponsoring = value.sponsoringDelegations;
	if (Array.isArray(sponsoring) && sponsoring.every((s) => typeof s === 'string')) {
		header.sponsoringDelegations = sponsoring;
	}
	return header;
}

/**
 * Decode a `data:image/svg+xml` URL back into raw SVG. Supports both the
 * percent-encoded form produced by `svgToDataUrl` and base64 data URLs.
 * Returns `null` if the input is not a recognisable SVG data URL.
 */
export function decodeEmblemDataUrl(dataUrl: string): string | null {
	const match = /^data:image\/svg\+xml(;base64)?,(.*)$/s.exec(dataUrl.trim());
	if (!match) return null;
	try {
		const decoded = match[1]
			? Buffer.from(match[2], 'base64').toString('utf-8')
			: decodeURIComponent(match[2]);
		return decoded.includes('<svg') ? decoded : null;
	} catch {
		return null;
	}
}

/** Reads the request body as a JSON object, rejecting oversized or malformed input. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
	const contentLength = Number(request.headers.get('content-length'));
	if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
		throw error(413, 'Request body too large');
	}

	const rawBody = await request.text();
	if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
		throw error(413, 'Request body too large');
	}

	let body: unknown;
	try {
		body = JSON.parse(rawBody);
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!isRecord(body)) throw error(400, 'Invalid request body');
	return body;
}

/** The most useful diagnostic a failed compiler run left behind. */
export function compileErrorDetail(e: unknown): string {
	if (isRecord(e) && typeof e.stderr === 'string') return e.stderr;
	if (isRecord(e) && e.stderr instanceof Buffer) return e.stderr.toString();
	if (e instanceof Error) return e.message;
	return String(e);
}

/**
 * The raw, self-contained Typst source of a position or introduction paper, or undefined when the
 * request carries a structured resolution instead.
 */
export function readRawTypst(body: Record<string, unknown>): string | undefined {
	const typst = body.typst;
	if (typeof typst !== 'string' || typst.length === 0) return undefined;
	if (typst.length > MAX_TYPST_CHARS) throw error(413, 'Typst source too large');
	return typst;
}

/**
 * The emblem actually rendered into the PDF: the conference logo when configured and decodable,
 * otherwise the bundled UN emblem.
 */
export function emblemSvgFor(header: ResolutionHeaderData): string {
	const emblemSvg =
		(header.conferenceEmblem && decodeEmblemDataUrl(header.conferenceEmblem)) || unEmblemSvg;
	if (Buffer.byteLength(emblemSvg) > MAX_SVG_BYTES) {
		throw error(413, 'Emblem SVG too large');
	}
	return emblemSvg;
}
