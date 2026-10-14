import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import {
	compileErrorDetail,
	decodeEmblemDataUrl,
	emblemSvgFor,
	readBody,
	readHeader,
	readRawTypst
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

describe('readRawTypst', () => {
	test('returns raw Typst source', () => {
		expect(readRawTypst({ typst: '= Title' })).toBe('= Title');
	});

	test('is undefined for a structured resolution or empty source', () => {
		expect(readRawTypst({ resolution: {} })).toBeUndefined();
		expect(readRawTypst({ typst: '' })).toBeUndefined();
		expect(readRawTypst({ typst: 1 })).toBeUndefined();
	});

	test('rejects oversized source', async () => {
		expect(await statusOf(() => readRawTypst({ typst: 'x'.repeat(2_000_001) }))).toBe(413);
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
