import { resolutionToTypst } from '@deutschemodelunitednations/munify-resolution-editor/res-markup';
import {
	ResolutionSchema,
	type ResolutionHeaderData
} from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { error, isHttpError } from '@sveltejs/kit';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { compileErrorDetail, emblemSvgFor, readBody, readHeader, readRawTypst } from './pdfRequest';
import type { RequestHandler } from './$types';

const execFileAsync = promisify(execFile);

const TYPST_BIN = join(process.cwd(), 'node_modules/.bin/typst');

/**
 * Generates the Typst source of a structured resolution in `dir`, writing the emblem it
 * references next to it.
 */
async function resolutionSource(
	resolution: unknown,
	header: ResolutionHeaderData,
	dir: string
): Promise<string> {
	const parsed = ResolutionSchema.safeParse(resolution);
	if (!parsed.success) throw error(400, 'Invalid resolution data');
	// The file is referenced via `#image(...)` so it works with all Typst versions.
	const emblemSvg = emblemSvgFor(header);
	const emblemPath = 'emblem.svg';
	await writeFile(join(dir, emblemPath), emblemSvg);
	return resolutionToTypst(parsed.data, header, { emblemPath });
}

/** Compiles `source` to a PDF in `dir` and returns the PDF's bytes. */
async function compileTypst(dir: string, source: string): Promise<Buffer> {
	await writeFile(join(dir, 'resolution.typ'), source);

	await execFileAsync(TYPST_BIN, ['compile', 'resolution.typ', 'resolution.pdf'], {
		cwd: dir,
		timeout: 30_000
	});

	return readFile(join(dir, 'resolution.pdf'));
}

async function ensureTypstAvailable() {
	try {
		await access(TYPST_BIN);
	} catch {
		throw error(500, 'Typst binary not available on the server');
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await readBody(request);

	// Two input shapes:
	//  - { typst }            raw, self-contained Typst source (position/intro
	//                         papers — text only, no assets)
	//  - { resolution, header } structured resolution; the source is generated
	//                         server-side so the emblem can be referenced via a
	//                         file path (`#image(...)`), required for Typst 0.10
	const rawTypst = readRawTypst(body);
	const header = readHeader(body.header);

	await ensureTypstAvailable();

	const dir = await mkdtemp(join(tmpdir(), 'mun-'));
	try {
		const source = rawTypst ?? (await resolutionSource(body.resolution, header, dir));
		const pdf = await compileTypst(dir, source);
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
		console.error('[api/pdf] Typst compilation failed:', compileErrorDetail(e));
		throw error(500, 'Typst compilation failed');
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
};
