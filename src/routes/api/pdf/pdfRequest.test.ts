import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import { isHttpError } from '@sveltejs/kit';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';
import { compileEnv } from '#api/services/typst';
import {
	compileErrorDetail,
	createCompileSlots,
	decodeEmblemDataUrl,
	emblemSvgFor,
	readBody,
	nestingDepth,
	readHeader,
	readPaperRequest
} from './pdfRequest';

const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

/** The HTTP status `run` failed with. */
async function statusOf(run: () => unknown) {
	try {
		await run();
	} catch (e) {
		if (isHttpError(e)) return e.status;
		throw e;
	}
	throw new Error('did not fail');
}

const post = (body: string, headers: Record<string, string> = {}) =>
	new Request('http://localhost/api/pdf', { method: 'POST', body, headers });

describe('readHeader', () => {
	test('is empty for anything but an object', () => {
		expect(readHeader(undefined)).toEqual({});
		expect(readHeader('header')).toEqual({});
		expect(readHeader(null)).toEqual({});
	});

	test('keeps the known string fields and drops everything else', () => {
		expect(
			readHeader({
				conferenceName: 'MUN-SH',
				topic: 'Water',
				documentNumber: 42,
				evil: 'x',
				sponsoringDelegations: ['Germany', 'France']
			})
		).toEqual({
			conferenceName: 'MUN-SH',
			topic: 'Water',
			sponsoringDelegations: ['Germany', 'France']
		});
	});

	test('drops sponsoring delegations that are not all strings', () => {
		expect(readHeader({ sponsoringDelegations: ['Germany', 1] })).toEqual({});
		expect(readHeader({ sponsoringDelegations: 'Germany' })).toEqual({});
	});
});

describe('decodeEmblemDataUrl', () => {
	test('decodes percent-encoded and base64 SVG data URLs', () => {
		expect(decodeEmblemDataUrl(`data:image/svg+xml,${encodeURIComponent(svg)}`)).toBe(svg);
		expect(
			decodeEmblemDataUrl(`  data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}  `)
		).toBe(svg);
	});

	test('rejects other data URLs, non-SVG content and broken encodings', () => {
		expect(decodeEmblemDataUrl('data:image/png;base64,AAAA')).toBeNull();
		expect(decodeEmblemDataUrl('data:image/svg+xml,hello')).toBeNull();
		expect(decodeEmblemDataUrl('data:image/svg+xml,%E0%A4%A')).toBeNull();
	});
});

describe('emblemSvgFor', () => {
	test('uses the conference emblem when it decodes', () => {
		expect(
			emblemSvgFor({ conferenceEmblem: `data:image/svg+xml,${encodeURIComponent(svg)}` })
		).toBe(svg);
	});

	test('falls back to the UN emblem', () => {
		expect(emblemSvgFor({})).toBe(unEmblemSvg);
		expect(emblemSvgFor({ conferenceEmblem: 'data:image/png;base64,AAAA' })).toBe(unEmblemSvg);
	});

	test('rejects an oversized emblem', async () => {
		const huge = `<svg>${'x'.repeat(2_000_001)}</svg>`;
		expect(
			await statusOf(() =>
				emblemSvgFor({ conferenceEmblem: `data:image/svg+xml,${encodeURIComponent(huge)}` })
			)
		).toBe(413);
	});
});

describe('readBody', () => {
	test('parses a JSON object', async () => {
		expect(await readBody(post('{"typst":"#hello"}'))).toEqual({ typst: '#hello' });
	});

	test('rejects a body announced or found to be too large', async () => {
		expect(await statusOf(() => readBody(post('{}', { 'content-length': '6000000' })))).toBe(413);
		expect(await statusOf(() => readBody(post(`"${'x'.repeat(5_000_001)}"`)))).toBe(413);
	});

	test('rejects malformed JSON and non-objects', async () => {
		expect(await statusOf(() => readBody(post('{nope')))).toBe(400);
		expect(await statusOf(() => readBody(post('"text"')))).toBe(400);
	});
});

describe('nestingDepth', () => {
	test('counts nested objects and arrays', () => {
		expect(nestingDepth('x')).toBe(0);
		expect(nestingDepth({})).toBe(1);
		expect(nestingDepth({ content: [{ text: 'a' }] })).toBe(3);
		expect(nestingDepth([[], [[{}]]])).toBe(4);
	});
});

describe('readPaperRequest', () => {
	const meta = {
		paperType: 'Positionspapier',
		committeeLabel: 'Gremium',
		topicLabel: 'Thema',
		disclaimer: 'Simulation'
	};
	const content = {
		type: 'doc',
		content: [
			{ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'bold' }] }] }
		]
	};

	test('reads the conference, content and labels of a paper', () => {
		expect(readPaperRequest({ paper: { conferenceId: 'c1', content, meta } })).toEqual({
			conferenceId: 'c1',
			content,
			meta
		});
	});

	test('keeps only the node fields the template reads', () => {
		const read = readPaperRequest({
			paper: { conferenceId: 'c1', content: { type: 'doc', extra: 1 }, meta }
		});
		expect(read?.content).toEqual({ type: 'doc' });
	});

	test('is undefined for a structured resolution', () => {
		expect(readPaperRequest({ resolution: {} })).toBeUndefined();
	});

	test('refuses content nested deeper than any editor produces, without recursing', async () => {
		let deep: Record<string, unknown> = { type: 'text', text: 'x' };
		for (let i = 0; i < 50_000; i++) deep = { type: 'paragraph', content: [deep] };
		expect(
			await statusOf(() => readPaperRequest({ paper: { conferenceId: 'c1', content: deep, meta } }))
		).toBe(400);
	});

	test('rejects malformed papers', async () => {
		expect(await statusOf(() => readPaperRequest({ paper: 'x' }))).toBe(400);
		expect(await statusOf(() => readPaperRequest({ paper: { content, meta } }))).toBe(400);
		expect(
			await statusOf(() =>
				readPaperRequest({ paper: { conferenceId: 'c1', content: { content: 'x' }, meta } })
			)
		).toBe(400);
		expect(
			await statusOf(() =>
				readPaperRequest({
					paper: { conferenceId: 'c1', content, meta: { ...meta, disclaimer: 'x'.repeat(2_001) } }
				})
			)
		).toBe(400);
	});
});

describe('compileErrorDetail', () => {
	test('prefers the compiler output', () => {
		expect(compileErrorDetail({ stderr: 'error: boom' })).toBe('error: boom');
		expect(compileErrorDetail({ stderr: Buffer.from('error: buffer') })).toBe('error: buffer');
	});

	test('falls back to the error message, then to the value itself', () => {
		expect(compileErrorDetail(new Error('spawn failed'))).toBe('spawn failed');
		expect(compileErrorDetail(42)).toBe('42');
		expect(compileErrorDetail({ stderr: 1 })).toBe('[object Object]');
	});
});

describe('createCompileSlots', () => {
	test('hands out up to the maximum and turns the next one away', () => {
		const slots = createCompileSlots(2);
		expect(slots.take()).toBeTypeOf('function');
		expect(slots.take()).toBeTypeOf('function');
		expect(slots.take()).toBeUndefined();
	});

	test('a released slot can be taken again, and releasing twice frees only one', () => {
		const slots = createCompileSlots(2);
		const first = slots.take();
		slots.take();
		first?.();
		first?.();
		expect(slots.taken).toBe(1);
		expect(slots.take()).toBeTypeOf('function');
		expect(slots.take()).toBeUndefined();
	});
});

describe('compileEnv', () => {
	test('hands the compiler PATH and a dead proxy, none of the server secrets', () => {
		const env = compileEnv('/usr/bin');
		expect(Object.keys(env).sort()).toEqual([
			'HTTPS_PROXY',
			'HTTP_PROXY',
			'PATH',
			'http_proxy',
			'https_proxy'
		]);
		expect(env.PATH).toBe('/usr/bin');
	});

	test('keeps Typst from downloading a package', { timeout: 30_000 }, async () => {
		const dir = await mkdtemp(join(tmpdir(), 'mun-test-'));
		try {
			await writeFile(join(dir, 'a.typ'), '#import "@preview/tablex:0.0.8": tablex\nHi\n');
			const run = promisify(execFile)(
				join(process.cwd(), 'node_modules/.bin/typst'),
				['compile', 'a.typ', 'a.pdf'],
				// An empty package cache, so a package the machine already has cannot pass the import.
				{ cwd: dir, env: { ...compileEnv(process.env.PATH), XDG_CACHE_HOME: dir } }
			);
			await expect(run).rejects.toMatchObject({
				stderr: expect.stringContaining('failed to download package')
			});
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
