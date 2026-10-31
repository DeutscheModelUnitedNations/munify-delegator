import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import type { ResolutionHeaderData } from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

// Fast-fail limits — this endpoint shells out to a compiler, so reject
// oversized inputs before any heavy processing.
const MAX_BODY_BYTES = 5_000_000; // 5 MB raw request body
const MAX_TYPST_CHARS = 2_000_000; // ~2 MB of Typst source
const MAX_SVG_BYTES = 2_000_000; // 2 MB decoded emblem SVG

const jsonObject = z.record(z.string(), z.unknown());

/**
 * Refuses callers without a session and answers who the caller is. Compiling is expensive (a
 * compiler run of up to 30 s per call), and the route is outside the OIDC handle's protected
 * prefixes, so it checks itself.
 */
export function assertSignedIn(locals: { oidc?: { user: { sub: string } } }): string {
	if (!locals.oidc) throw error(401, 'Unauthorized');
	return locals.oidc.user.sub;
}

/**
 * At most `max` compiles at the same time. `take` answers the function that gives the slot back
 * (calling it twice gives back one slot), or undefined when every slot is taken.
 */
export function createCompileSlots(max: number) {
	let taken = 0;
	return {
		take(): (() => void) | undefined {
			if (taken >= max) return undefined;
			taken++;
			let released = false;
			return () => {
				if (released) return;
				released = true;
				taken--;
			};
		},
		get taken() {
			return taken;
		}
	};
}

/** A header field: kept when it is a string, dropped otherwise. */
const headerText = z.string().optional().catch(undefined);

/** The resolution header from untrusted input: the known fields of the right type, nothing else. */
const resolutionHeader = z
	.object({
		conferenceName: headerText,
		conferenceTitle: headerText,
		committeeAbbreviation: headerText,
		committeeFullName: headerText,
		committeeResolutionHeadline: headerText,
		documentNumber: headerText,
		topic: headerText,
		authoringDelegation: headerText,
		lastEdited: headerText,
		conferenceEmblem: headerText,
		sponsoringDelegations: z.array(z.string()).optional().catch(undefined)
	})
	.catch({});

export function readHeader(value: unknown): ResolutionHeaderData {
	return resolutionHeader.parse(value);
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

/** A proxy nothing listens on: every connection through it is refused. */
const DEAD_PROXY = 'http://127.0.0.1:9';

/**
 * The environment a compile runs in. Only `PATH` comes from the server, which the `typst` wrapper
 * needs to find `node`: the compiler never sees the app's secrets. All traffic goes to a dead proxy,
 * so a source importing a `@preview` package the server has not cached fails instead of
 * downloading it (Typst 0.10 has no flag to switch package downloads off).
 */
export function compileEnv(path: string | undefined): Record<string, string> {
	return {
		...(path ? { PATH: path } : {}),
		HTTPS_PROXY: DEAD_PROXY,
		HTTP_PROXY: DEAD_PROXY,
		https_proxy: DEAD_PROXY,
		http_proxy: DEAD_PROXY
	};
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
	const parsed = jsonObject.safeParse(body);
	if (!parsed.success) throw error(400, 'Invalid request body');
	return parsed.data;
}

/** What a failed child process left on stderr, as `execFile` rejects with it. */
const compilerOutput = z.object({ stderr: z.union([z.string(), z.instanceof(Buffer)]) });

/** The most useful diagnostic a failed compiler run left behind. */
export function compileErrorDetail(e: unknown): string {
	const output = compilerOutput.safeParse(e);
	if (output.success) return output.data.stderr.toString();
	if (e instanceof Error) return e.message;
	return String(e);
}

/**
 * The raw, self-contained Typst source of a position or introduction paper, or undefined when the
 * request carries a structured resolution instead.
 */
export function readRawTypst(body: Record<string, unknown>): string | undefined {
	const parsed = z.string().min(1).safeParse(body.typst);
	if (!parsed.success) return undefined;
	const typst = parsed.data;
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
