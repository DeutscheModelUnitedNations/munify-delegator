import { resolutionToTypst } from '@deutschemodelunitednations/munify-resolution-editor/res-markup';
import {
	ResolutionSchema,
	type ResolutionHeaderData
} from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import { error, isHttpError } from '@sveltejs/kit';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { RequestHandler } from './$types';

const execFileAsync = promisify(execFile);

const TYPST_BIN = join(process.cwd(), 'node_modules/.bin/typst');

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
function readHeader(value: unknown): ResolutionHeaderData {
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
function decodeEmblemDataUrl(dataUrl: string): string | null {
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

export const POST: RequestHandler = async ({ request }) => {
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

	// Two input shapes:
	//  - { typst }            raw, self-contained Typst source (position/intro
	//                         papers — text only, no assets)
	//  - { resolution, header } structured resolution; the source is generated
	//                         server-side so the emblem can be referenced via a
	//                         file path (`#image(...)`), required for Typst 0.10
	const rawTypst = body.typst;
	const hasRawTypst = typeof rawTypst === 'string' && rawTypst.length > 0;
	if (hasRawTypst && rawTypst.length > MAX_TYPST_CHARS) {
		throw error(413, 'Typst source too large');
	}

	const header = readHeader(body.header);

	try {
		await access(TYPST_BIN);
	} catch {
		throw error(500, 'Typst binary not available on the server');
	}

	const dir = await mkdtemp(join(tmpdir(), 'mun-'));
	try {
		let source: string;
		if (hasRawTypst) {
			source = rawTypst;
		} else {
			const parsed = ResolutionSchema.safeParse(body.resolution);
			if (!parsed.success) throw error(400, 'Invalid resolution data');
			// Resolve the emblem actually rendered into the PDF: the conference
			// logo when configured, otherwise the bundled UN emblem fallback. The
			// file is referenced via `#image(...)` so it works with all Typst
			// versions.
			const emblemSvg = header.conferenceEmblem
				? (decodeEmblemDataUrl(header.conferenceEmblem) ?? unEmblemSvg)
				: unEmblemSvg;
			if (Buffer.byteLength(emblemSvg) > MAX_SVG_BYTES) {
				throw error(413, 'Emblem SVG too large');
			}
			const emblemPath = 'emblem.svg';
			await writeFile(join(dir, emblemPath), emblemSvg);
			source = resolutionToTypst(parsed.data, header, { emblemPath });
		}
		await writeFile(join(dir, 'resolution.typ'), source);

		await execFileAsync(TYPST_BIN, ['compile', 'resolution.typ', 'resolution.pdf'], {
			cwd: dir,
			timeout: 30_000
		});

		const pdf = await readFile(join(dir, 'resolution.pdf'));
		return new Response(new Uint8Array(pdf), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'attachment; filename="resolution.pdf"'
			}
		});
	} catch (e) {
		// Let intentional HTTP errors (e.g. 400 invalid resolution) propagate
		// instead of being masked as a 500 compilation failure.
		if (isHttpError(e)) throw e;
		let detail: string;
		if (isRecord(e) && typeof e.stderr === 'string') detail = e.stderr;
		else if (isRecord(e) && e.stderr instanceof Buffer) detail = e.stderr.toString();
		else if (e instanceof Error) detail = e.message;
		else detail = String(e);
		// Log full diagnostics server-side only; never leak compiler output
		// (paths, source fragments) to the client.
		console.error('[api/pdf] Typst compilation failed:', detail);
		throw error(500, 'Typst compilation failed');
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
};
