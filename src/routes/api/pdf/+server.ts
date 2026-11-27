import { resolutionToTypst } from '@deutschemodelunitednations/munify-resolution-editor/res-markup';
import {
	ResolutionSchema,
	type ResolutionHeaderData
} from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { error, isHttpError } from '@sveltejs/kit';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { redisClient } from '#api/services/redisClient';
import { createAttemptLimiter, createCounter } from '#api/services/failureLimit';
import {
	assertSignedIn,
	compileErrorDetail,
	createCompileSlots,
	emblemSvgFor,
	readBody,
	readHeader,
	readPaperRequest,
	type PaperRequest
} from './pdfRequest';
import type { RequestHandler } from './$types';
import { logger } from '#lib/logger';
import { compileTypst } from '#api/services/typst';
import { typstBrandingOf } from '#api/services/typstBranding';
import { paperToTypst } from '#lib/helpers/paperTypst';

/**
 * Compiles one account may start in ten minutes. People export a paper or resolution now and then;
 * twenty leaves room for retries and stops anybody keeping the compiler busy.
 */
const COMPILES_PER_WINDOW = 20;
const WINDOW_SECONDS = 10 * 60;
/** Compiles running at once in this process; beyond that a request is turned away, not queued. */
const PARALLEL_COMPILES = 2;

const compileLimiter = createAttemptLimiter({
	counter: createCounter({
		redis: redisClient({ lazyConnect: true }),
		prefix: 'pdf-compile',
		limit: COMPILES_PER_WINDOW,
		windowSeconds: WINDOW_SECONDS
	}),
	refused: () => error(429, 'Too many PDF requests, please try again later')
});
const compileSlots = createCompileSlots(PARALLEL_COMPILES);

/**
 * Generates the Typst source of a structured resolution in `dir`, writing the emblem it
 * references next to it.
 */
async function resolutionSource({
	resolution,
	header,
	dir
}: {
	resolution: unknown;
	header: ResolutionHeaderData;
	dir: string;
}): Promise<string> {
	const parsed = ResolutionSchema.safeParse(resolution);
	if (!parsed.success) throw error(400, 'Invalid resolution data');
	// The file is referenced via `#image(...)` so it works with all Typst versions.
	const emblemSvg = emblemSvgFor(header);
	const emblemPath = 'emblem.svg';
	await writeFile(join(dir, emblemPath), emblemSvg);
	return resolutionToTypst(parsed.data, header, { emblemPath });
}

/**
 * Generates the Typst source of a position or introduction paper in `dir`, in the conference's
 * branding, writing its logo next to it.
 */
async function paperSource({ paper, dir }: { paper: PaperRequest; dir: string }): Promise<string> {
	const branding = await typstBrandingOf({ conferenceId: paper.conferenceId, dir });
	if (!branding) throw error(404, 'Conference not found');
	return paperToTypst({ content: paper.content, meta: paper.meta, branding });
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const caller = assertSignedIn(locals);
	const body = await readBody(request);
	// Before validating the content: a refused request costs the allowance too
	await compileLimiter.take(caller);

	// Two input shapes, both turned into Typst here so the compiler only sees generated source:
	//  - { paper: { conferenceId, content, meta } }  position/introduction paper, set in the
	//                                                conference's branding with its logo
	//  - { resolution, header }                      structured resolution with its emblem
	const paper = readPaperRequest(body);
	const header = readHeader(body.header);

	const release = compileSlots.take();
	if (!release) throw error(503, 'PDF generation is busy, please try again in a moment');
	try {
		return await renderPdf({ paper, resolution: body.resolution, header });
	} finally {
		release();
	}
};

/** Renders the paper, or else the structured resolution, in a temporary directory. */
async function renderPdf({
	paper,
	resolution,
	header
}: {
	paper: PaperRequest | undefined;
	resolution: unknown;
	header: ResolutionHeaderData;
}): Promise<Response> {
	const dir = await mkdtemp(join(tmpdir(), 'mun-'));
	try {
		const source = paper
			? await paperSource({ paper, dir })
			: await resolutionSource({ resolution, header, dir });
		const pdf = await compileTypst({ dir, source });
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
		// Log full diagnostics server-side only; never leak compiler output
		// (paths, source fragments) to the client.
		logger.error('Typst compilation failed', { detail: compileErrorDetail(e) });
		throw error(500, 'Typst compilation failed');
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
