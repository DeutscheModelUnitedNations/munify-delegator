import {
	buildResolutionUploadForm,
	findResolutionUploadProblem,
	isPdfFile,
	MAX_RESOLUTION_FILE_SIZE,
	MAX_RESOLUTION_UPLOAD_FILES,
	parseResolutionUploadForm,
	summarizeResolutionUploadResult
} from '$lib/services/resolutionUpload';
import { describe, expect, test } from 'vitest';

const pdf = (name: string, size = 1_000) => ({ name, type: 'application/pdf', size });

describe('isPdfFile', () => {
	test('accepts a PDF with a .pdf name', () => {
		expect(isPdfFile(pdf('Resolution.PDF'))).toBe(true);
	});

	test('rejects a .pdf name with another media type', () => {
		expect(isPdfFile({ name: 'evil.pdf', type: 'text/html' })).toBe(false);
	});

	test('rejects a PDF media type without a .pdf name', () => {
		expect(isPdfFile({ name: 'resolution.exe', type: 'application/pdf' })).toBe(false);
	});
});

describe('findResolutionUploadProblem', () => {
	test('accepts a valid batch', () => {
		expect(findResolutionUploadProblem([pdf('a.pdf'), pdf('b.pdf')])).toBeUndefined();
	});

	test('requires at least one file', () => {
		expect(findResolutionUploadProblem([])).toBe('noFiles');
	});

	test('caps the number of files', () => {
		const files = Array.from({ length: MAX_RESOLUTION_UPLOAD_FILES + 1 }, (_, i) =>
			pdf(`${i}.pdf`)
		);
		expect(findResolutionUploadProblem(files)).toBe('tooManyFiles');
	});

	test('rejects non-PDF files', () => {
		expect(
			findResolutionUploadProblem([pdf('a.pdf'), { name: 'b.docx', type: 'x', size: 1 }])
		).toBe('notPdf');
	});

	test('rejects a single file over the size limit', () => {
		expect(findResolutionUploadProblem([pdf('a.pdf', MAX_RESOLUTION_FILE_SIZE + 1)])).toBe(
			'fileTooLarge'
		);
	});

	test('rejects a batch that exceeds the request size limit', () => {
		const files = Array.from({ length: 7 }, (_, i) => pdf(`${i}.pdf`, MAX_RESOLUTION_FILE_SIZE));
		expect(findResolutionUploadProblem(files)).toBe('batchTooLarge');
	});
});

describe('upload form', () => {
	test('round-trips files and committee', () => {
		const files = [new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })];
		const parsed = parseResolutionUploadForm(buildResolutionUploadForm(files, 'c-1'));
		expect(parsed.committeeId).toBe('c-1');
		expect(parsed.files.map((f) => f.name)).toEqual(['a.pdf']);
	});

	test('omits an empty committee and drops empty file entries', () => {
		const formData = buildResolutionUploadForm([new File([], 'empty.pdf')], '');
		expect(formData.has('committeeId')).toBe(false);
		expect(parseResolutionUploadForm(formData)).toEqual({ files: [], committeeId: undefined });
	});
});

describe('summarizeResolutionUploadResult', () => {
	test('success', () => {
		expect(summarizeResolutionUploadResult({ type: 'success', status: 200 })).toEqual({
			ok: true,
			error: undefined,
			storedAny: true
		});
	});

	test('partial failure reports the message and that some files were stored', () => {
		expect(
			summarizeResolutionUploadResult({
				type: 'failure',
				status: 500,
				data: { uploaded: 2, uploadError: 'b.pdf failed' }
			})
		).toEqual({ ok: false, error: 'b.pdf failed', storedAny: true });
	});

	test('validation failure stores nothing', () => {
		expect(
			summarizeResolutionUploadResult({ type: 'failure', status: 400, data: { uploadError: 'x' } })
		).toEqual({ ok: false, error: 'x', storedAny: false });
	});

	test('unexpected error', () => {
		expect(summarizeResolutionUploadResult({ type: 'error', error: new Error('boom') })).toEqual({
			ok: false,
			error: 'boom',
			storedAny: false
		});
	});
});
