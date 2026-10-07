import {
	findResolutionFileProblem,
	findResolutionUploadProblem,
	isPdfFile,
	MAX_RESOLUTION_FILE_SIZE,
	MAX_RESOLUTION_UPLOAD_FILES,
	uploadEach
} from './resolutionUpload';
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

	test('lets a batch of full-size files through, since each goes up on its own', () => {
		const files = Array.from({ length: 7 }, (_, i) => pdf(`${i}.pdf`, MAX_RESOLUTION_FILE_SIZE));
		expect(findResolutionUploadProblem(files)).toBeUndefined();
	});
});

describe('findResolutionFileProblem', () => {
	const dataURL = (bytes: number) =>
		`data:application/pdf;base64,${Buffer.alloc(bytes).toString('base64')}`;

	test('accepts a PDF data URL up to the limit', () => {
		expect(findResolutionFileProblem('a.pdf', dataURL(1_000))).toBeUndefined();
		expect(findResolutionFileProblem('a.pdf', dataURL(MAX_RESOLUTION_FILE_SIZE))).toBeUndefined();
	});

	test('rejects one over the limit', () => {
		expect(findResolutionFileProblem('a.pdf', dataURL(MAX_RESOLUTION_FILE_SIZE + 1))).toBe(
			'fileTooLarge'
		);
	});

	test('rejects another media type or file name', () => {
		expect(findResolutionFileProblem('a.pdf', 'data:text/html;base64,AAAA')).toBe('notPdf');
		expect(findResolutionFileProblem('a.html', dataURL(10))).toBe('notPdf');
	});
});

describe('uploadEach', () => {
	test('uploads every file in order and names the ones that failed', async () => {
		const uploaded: string[] = [];
		const failed = await uploadEach(
			[{ name: 'a.pdf' }, { name: 'b.pdf' }, { name: 'c.pdf' }],
			async (file) => {
				if (file.name === 'b.pdf') throw new Error('boom');
				uploaded.push(file.name);
			}
		);
		expect(uploaded).toEqual(['a.pdf', 'c.pdf']);
		expect(failed).toEqual(['b.pdf']);
	});
});
